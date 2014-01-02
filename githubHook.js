// This module provides a request handler for HTTP calls from Github web hooks.
var fs = require('fs'),
    colors = require('colors'),
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
 */
function handlePullRequest(payload, repoClient, cb) {
    var action = payload.action,
        githubUser = payload.pull_request.user.login,
        head = payload.pull_request.head,
        base = payload.pull_request.base;

    console.log('Received pull request "' + action + '" from ' + githubUser);

    if (action == 'closed') {
        // if this pull request just got merged, we need to re-validate the
        // fast-forward status of all the other open pull requests
        if (payload.pull_request.merged) {
            console.log('A PR just merged. Re-validating open pull requests...');
            contributors.getAll(repoClient.contributorsUrl, function(err, contributors) {
                shaValidator.revalidateAllOpenPullRequests(contributors, repoClient, dynamicValidatorModules, cb);
            });
        } else {
            if (cb) { cb(); }
        }
    } else {
        // Only process PRs against the master branch.
        if (payload.pull_request.base.ref == 'master') {
            shaValidator.performCompleteValidation(head.sha, githubUser, repoClient, dynamicValidatorModules, true, cb);
        } else {
            console.log(('Ignoring pull request against ' + payload.pull_request.base.label).yellow);
            if (cb) { cb(); }
        }
    }
}

/**
 * Given a request payload from Github, and the RepositoryClient object associated
 * with this repo, this function retrieves all the known statuses for the repo, 
 * assures that this status did not originate from this server (nupic.tools), then
 * performs a complete validation of the repository.
 */
function handleStateChange(payload, repoClient, cb) {
    console.log('State of ' + payload.sha + ' has changed to "' + payload.state + '".');
    // Ignore state changes on closed pull requests
    if (payload.pull_request && payload.pull_request.state == 'closed') {
        console.log(('Ignoring status of closed pull request (' + payload.sha + ')').yellow);
        if (cb) { cb(); }
        return;
    }
    repoClient.getCommit(payload.sha, function(err, commit) {
        var commitAuthor = commit.author.login;
        // Get statuses and check the latest one
        repoClient.getAllStatusesFor(payload.sha, function(err, statusHistory) {
            var latestStatus = utils.sortStatuses(statusHistory).shift();
            if (latestStatus && latestStatus.description.indexOf(NUPIC_STATUS_PREFIX) == 0) {
                // ignore statuses that were created by this server
                console.log(('Ignoring "' + payload.state + '" status created by nupic.tools.').yellow);
                if (cb) { cb(); }
            } else {
                shaValidator.performCompleteValidation(payload.sha, commitAuthor, repoClient, dynamicValidatorModules, true, cb);
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
    console.log('Github push event on ' + repoSlug + '/' + branch);
    // Only process pushes to master, and only when there is a push hook defined.
    if (branch == 'master' && 
            monitorConfig && monitorConfig.hooks && monitorConfig.hooks.push) {
        command = monitorConfig.hooks.push;
        child = exec(command, function (error, stdout, stderr) {
            console.log(stdout.yellow);
            if (error !== null) {
                console.log(('hook command execution error: ' + error).red);
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
            console.log('Cannot understand github payload!\n'.red + req.body.payload.yellow);
            return res.end();
        }

        repoClient = repoClients[repoName];

        // If this application is not monitoring the repo Github is telling us 
        // about, just ignore it.
        if (! repoClient) {
            console.log(('No repository client available for ' + repoName).red);
            return res.end();
        }
        
        console.log("Github hook executing for " + repoClient.toString().magenta);

        function whenDone() {
            res.end();
        }

        // If the payload has a 'state', that means this is a state change.
        if (payload.state) {
            handleStateChange(payload, repoClient, whenDone);
        } else if (payload.pull_request) {
            handlePullRequest(payload, repoClient, whenDone);
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
