var fs = require('fs'),
    colors = require('colors'),
    contributors = require('./utils/contributors'),
    shaValidator = require('./utils/shaValidator'),
    NUPIC_STATUS_PREFIX = 'NuPIC Status:',
    VALIDATOR_DIR = './validators',
    validators = [],
    repoClients;

function initializeValidators(dir) {
    fs.readdirSync(dir).forEach(function(validator) {
        validators.push(require(dir + '/' + validator.split('.').shift()));
    });
}

function handlePullRequest(payload, repoClient) {
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
                shaValidator.revalidateAllOpenPullRequests(contributors, repoClient, validators);
            });
        }
    } else {
        // Only process PRs against the master branch.
        if (payload.pull_request.base.ref == 'master') {
            shaValidator.performCompleteValidation(head.sha, githubUser, repoClient, validators, true);
        } else {
            console.log(('Ignoring pull request against ' + payload.pull_request.base.label).yellow);
        }
    }
}

function handleStateChange(payload, repoClient) {
    console.log('State of ' + payload.sha + ' updated to ' + payload.state);
    // Ignore state changes on closed pull requests
    if (payload.pull_request && payload.pull_request.state == 'closed') {
        console.log(('Ignoring status of closed pull request (' + payload.sha + ')').yellow);
        return;
    }
    // Get statuses and check the latest one
    repoClient.getAllStatusesFor(payload.sha, function(err, statusHistory) {
        var latestStatus = statusHistory[0];
        if (latestStatus && latestStatus.description.indexOf(NUPIC_STATUS_PREFIX) == 0) {
            // ignore statuses that were created by this server
            console.log(('Ignoring "' + payload.state + '" status created by nupic.tools.').yellow);
        } else {
            shaValidator.performCompleteValidation(payload.sha, payload.sender.login, repoClient, validators, true);
        }
    });
}

module.exports = function(clients) {
    repoClients = clients;
    initializeValidators(VALIDATOR_DIR);
    return function(req, res) {
        var payload = JSON.parse(req.body.payload),
            repoName = payload.name || payload.repository.full_name,
            repoClient = repoClients[repoName];

        if (! repoClient) {
            console.log(('No repository client available for ' + repoName).red);
            return res.end();
        }
        
        console.log(repoClient.toString().magenta);

        if (payload.state) {
            handleStateChange(payload, repoClient);
        } else {
            handlePullRequest(payload, repoClient);
        }

        res.end();

    };
};
