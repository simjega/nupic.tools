// This module provides a request handler for HTTP calls from Github web hooks.
var fs = require('fs'),
    log = require('./utils/log'),
    utils = require('./utils/general'),
    contributors = require('./utils/contributors'),
    shaValidator = require('./utils/shaValidator'),
    exec = require('child_process').exec,
    NUPIC_STATUS_PREFIX = 'NuPIC Status:',
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
        base = pullRequest.base;

    log('Received pull request "' + action + '" from ' + githubUser);

    if (action == 'closed') {
        // if this pull request just got merged, we need to re-validate the
        // fast-forward status of all the other open pull requests
        if (pullRequest.merged) {
            log('A PR just merged. Re-validating open pull requests...');
            contributors.getAll(repoClient.contributorsUrl, 
                function(err, contributors) {
                    shaValidator.revalidateAllOpenPullRequests(
                        contributors, 
                        repoClient, 
                        dynamicValidatorModules, 
                        cb
                    );
                }
            );
        } else {
            if (cb) { cb(); }
        }
    } else {
        shaValidator.performCompleteValidation(
            head.sha, 
            githubUser, 
            repoClient, 
            dynamicValidatorModules, 
            true, 
            cb
        );
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
        var commitAuthor = commit.author.login;
        // Get statuses and check the latest one
        repoClient.getAllStatusesFor(sha, function(err, statusHistory) {
            var latestStatus = utils.sortStatuses(statusHistory).shift();
            if (latestStatus && latestStatus.description.indexOf(NUPIC_STATUS_PREFIX) == 0) {
                // ignore statuses that were created by this server
                log.warn('Ignoring "' + state + '" status created by nupic.tools.');
                if (cb) { cb(); }
            } else {
                shaValidator.performCompleteValidation(sha, commitAuthor, repoClient, dynamicValidatorModules, true, cb);
            }
        });
    });
}

function handlePushEvent(payload, config) {
    var repoSlug = payload.repository.organization 
        + '/' + payload.repository.name,
        monitorConfig = config.monitors[repoSlug],
        branch = payload.ref.split('/').pop(),
        command;
    log('Github push event on ' + repoSlug + '/' + branch);
    // Only process pushes to master, and only when there is a push hook defined.
    if (branch == 'master' && 
            monitorConfig && monitorConfig.hooks && monitorConfig.hooks.push) {
        command = monitorConfig.hooks.push;
        child = exec(command, function (error, stdout, stderr) {
            log.warn(stdout);
            if (error !== null) {
                log.error('hook command execution error: ' + error);
            }
        });
    }
}

// Given all the RepositoryClient objects, this module initializes all the dynamic
// validators and returns a request handler function to handle all Github web hook
// requests, including status updates and pull request notifications.
function initializer(clients, config) {
    var validatorExclusions = [];
    repoClients = clients;
    if (config.validators && config.validators.exclude) {
        validatorExclusions = config.validators.exclude;
    }
    dynamicValidatorModules = utils.initializeModulesWithin(VALIDATOR_DIR, validatorExclusions);
    return function(req, res) {
        // Get what repository Github is telling us about
        var payload = JSON.parse(req.body.payload),
            repoName, repoClient;

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
            log.error('No repository client available for ' + repoName);
            return res.end();
        }
        
        log("Github hook executing for " + repoClient.toString().magenta);

        function whenDone() {
            res.end();
        }

        // If the payload has a 'state', that means this is a state change.
        if (payload.state) {
            handleStateChange(payload.sha, payload.state, payload.pull_request, repoClient, whenDone);
        } else if (payload.pull_request) {
            handlePullRequest(payload.action, payload.pull_request, repoClient, whenDone);
        } else {
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
