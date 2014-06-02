// This module provides a request handler for HTTP calls from Github web hooks.
var fs = require('fs'),
    log = require('./utils/log'),
    utils = require('./utils/general'),
    contributors = require('./utils/contributors'),
    shaValidator = require('./utils/shaValidator'),
    exec = require('child_process').exec,
    VALIDATOR_DIR = 'validators',
    // All the validator modules
    dynamicValidatorModules = [],
    repoClients;

/** 
 * Given the payload for a Github pull request notification and the associated
 * RepositoryClient object, this function either validates the PR, re-validates 
 * all other open PRs (if the PR merged), or ignores it if not against 'master'.
 * @param action {string} Whether PR was opened, closed, etc.
 * @param pullRequest {object} the PR payload from Github.
 * @param repoClient {RepositoryClient} Repo client associated with this repo this
 *                                      PR was created against.
 * @param cb {function} Will be called when PR has been handled.
 */
function handlePullRequest(action, pullRequest, repoClient, cb) {
    var githubUser = pullRequest.user.login,
        head = pullRequest.head,
        base = pullRequest.base,
        sha = head.sha;

    log('Received pull request "' + action + '" from ' + githubUser);

    if (action == 'closed') {
        // If this pull request just got merged, we need to re-trigger the
        // Travis-CI jobs of all the other open pull requests.
        if (pullRequest.merged) {
            log('A PR just merged. Re-validating open pull requests...');
            contributors.getAll(repoClient.contributorsUrl, 
                function(err, contributors) {
                    if (err) {
                        return cb(err);
                    }
                    shaValidator.triggerTravisBuildsOnAllOpenPullRequests(repoClient);
                }
            );
        } else {
            if (cb) { cb(); }
        }
    } else {

        // only runs validation if the PR is mergeable, see nupic.tools#65
        if(pullRequest.mergeable)
        {
            utils.lastStatusWasExternal(repoClient, sha, function(external) {
                if (external) {
                    shaValidator.performCompleteValidation(
                        sha, 
                        githubUser, 
                        repoClient, 
                        dynamicValidatorModules, 
                        true, 
                        cb
                    );
                } else {
                    // ignore statuses that were created by this server
                    log.warn('Ignoring "' + state + '" status created by nupic.tools.');
                    if (cb) { cb(); }
                }
            });   
        }
        else
        {
            // Just let Github status stand, which might warn about the mergeable status
            log('The PR is not mergeable, mergeable_state: ' + pullRequest.mergeable_state);
            if (cb) { cb(); }
            // TODO generate nupic.tools' own warning message
        }
    }
}

/**
 * Given a request payload from Github, and the RepositoryClient object associated
 * with this repo, this function retrieves all the known statuses for the repo, 
 * assures that this status did not originate from this server (nupic.tools), then
 * performs a complete validation of the repository.
 * @param sha {string} SHA of the tip of the PR.
 * @state {string} State of the PR (opened, closed, merged, etc)
 * @param pullRequest {object} the PR payload from Github.
 * @param repoClient {RepositoryClient} Repo client associated with this repo this
 *                                      PR was created against.
 * @param cb {function} Will be called when PR has been handled.
 */
function handleStateChange(sha, state, pullRequest, repoClient, cb) {
    log('State of ' + sha + ' has changed to "' + state + '".');
    // Ignore state changes on closed pull requests
    if (pullRequest && pullRequest.state == 'closed') {
        log.warn('Ignoring status of closed pull request (' + sha + ')');
        if (cb) { cb(); }
        return;
    }
    repoClient.getCommit(sha, function(err, commit) {
        utils.lastStatusWasExternal(repoClient, sha, function(external) {
            var commitAuthor = undefined;
            // This is a temporary block until I figure out what is going on here.
            if (! commit.author) {
                log.warn('PR has no author!');
                console.log('--------------------------');
                console.log(sha);
                console.log('--------------------------');
                console.log(state);
                console.log('--------------------------');
                console.log(pullRequest);
                console.log('--------------------------');
                if (cb) { cb(); }
                return;
            }
            commitAuthor = commit.author.login;
            if (external) {
                shaValidator.performCompleteValidation(
                    sha, 
                    commitAuthor, 
                    repoClient, 
                    dynamicValidatorModules, 
                    true, 
                    cb
                );
            } else {
                // ignore statuses that were created by this server
                log.warn('Ignoring "' + state + '" status created by nupic.tools.');
                if (cb) { cb(); }
            }
        });
    });
}

function executeCommand(command) {
    child = exec(command, function (error, stdout, stderr) {
        log.verbose(stdout);
        if (stderr) { log.warn(stderr); }
        if (error !== null) {
            log.error('command execution error: ' + error);
        }
    });
}

function getPushHookForMonitor(monitorConfig) {
    var hook = undefined;
    if (monitorConfig && monitorConfig.hooks && monitorConfig.hooks.push) {
        hook = monitorConfig.hooks.push;
    }
    return hook;
}

/**
 * Handles an event from Github that indicates that a PR has been merged into one
 * of the repositories. This could trigger a script to run locally in response, 
 * called a "push hook", which are defined in the configuration of each repo as
 * hooks.push = 'path/to/script'.
 * @param payload {object} Full Github payload from the API.
 * @param config {object} Application configuration (used to extract the 
 *                        repository monitor configuration and push hook).
 */
function handlePushEvent(payload, config) {
    var repoSlug = payload.repository.organization 
            + '/' + payload.repository.name,
        branch = payload.ref.split('/').pop(),
        monitorConfig = config.monitors[repoSlug],
        pushHook = getPushHookForMonitor(monitorConfig);
    log('Github push event on ' + repoSlug + '/' + branch);
    // Only process pushes to master, and only when there is a push hook defined.
    if (branch == 'master' && pushHook) {
        executeCommand(pushHook)
    }
}

/**
 * Given all the RepositoryClient objects, this module initializes all the dynamic
 * validators and returns a request handler function to handle all Github web hook
 * requests, including status updates and pull request notifications.
 * @param clients {RepositoryClient[]} Every RepositoryClient for each repo 
 *                                     being monitored.
 * @param config {object} Application configuration.
 */
function initializer(clients, config) {
    var validatorExclusions = [];
    repoClients = clients;
    if (config.validators && config.validators.exclude) {
        validatorExclusions = config.validators.exclude;
    }
    dynamicValidatorModules = utils.initializeModulesWithin(VALIDATOR_DIR, validatorExclusions);
    /**
     * This is the actual request handler, which is returned after the initializer
     * is called. Handles every hook call from Github.
     */
    return function(req, res) {
        // Get what repository Github is telling us about
        var payload = JSON.parse(req.body.payload),
            repoName, repoClient, repoSlug, branch, pushHook;

        if (payload.name) {
            repoName = payload.name;
        } else if (payload.repository.full_name) {
            repoName = payload.repository.full_name;
        } else if (payload.repository) {
            // Probably a push event.
            repoName = payload.repository.owner.name + '/' + payload.repository.name;
        } else {
            log.error('Cannot understand github payload!\n')
            log.warn(req.body.payload);
            return res.end();
        }

        repoClient = repoClients[repoName];

        // If this application is not monitoring the repo Github is telling us 
        // about, just ignore it.
        if (! repoClient) {
            log.warn('No repository client available for ' + repoName);
            return res.end();
        }
        
        log.verbose("Github hook executing for " + repoClient.toString().magenta);

        function whenDone() {
            res.end();
        }

        // If the payload has a 'state', that means this is a state change.
        if (payload.state) {
            log.debug('** Handle State Change **');
            handleStateChange(
                payload.sha, 
                payload.state, 
                payload.pull_request, 
                repoClient, 
                whenDone
            );
        } else if (payload.pull_request) {
            log.debug('** Handle Pull Request Update **');
            handlePullRequest(
                payload.action, 
                payload.pull_request, 
                repoClient, 
                whenDone
            );
        } else {
            log.debug('** Handle Push Event **')
            handlePushEvent(payload, config);
        }
    };
}

module.exports = {
    initializer: initializer,
    getValidators: function() {
        return dynamicValidatorModules.map(function(v) {
            return v.name;
        });
    }
};
