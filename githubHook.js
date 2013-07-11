var fs = require('fs'),
    colors = require('colors'),
    contributors = require('./utils/contributors'),
    NUPIC_STATUS_PREFIX = 'NuPIC Status:',
    VALIDATOR_DIR = './validators',
    validators = [],
    repoClients;

function initializeValidators(dir) {
    fs.readdirSync(dir).forEach(function(validator) {
        validators.push(require(dir + '/' + validator.split('.').shift()));
    });
}

function revalidateAllOpenPullRequests(githubUser, contributors, repoClient) {
    repoClient.getAllOpenPullRequests(function(err, prs) {
        console.log('Found ' + prs.length + ' open pull requests...');
        prs.map(function(pr) { return pr.head.sha; }).forEach(function(sha) {
            performCompleteValidation(sha, githubUser, repoClient);
        });
    });
}

function coloredStatus(status) {
    if (status == 'success') {
        return status.green;
    } else if (status == 'pending') {
        return status.yellow;
    } else {
        return status.red;
    }
}

function postNewNupicStatus(sha, statusDetails, repoClient) {
    console.log('Posting new NuPIC Status (' + coloredStatus(statusDetails.state) + ') to github for ' + sha);
    repoClient.github.statuses.create({
        user: repoClient.org,
        repo: repoClient.repo,
        sha: sha,
        state: statusDetails.state,
        description: 'NuPIC Status: ' + statusDetails.description,
        target_url: statusDetails.target_url
    });
}

function performCompleteValidation(sha, githubUser, repoClient) {

    console.log(('\nVALIDATING ' + sha).cyan);

    repoClient.getAllStatusesFor(sha, function(err, statusHistory) {
        if (err) throw err;
        // clone of the global validators array
        var commitValidators = validators.slice(0),
            validationFailed = false;

        function runNextValidation() {
            var validator;
            if (validationFailed) return;
            validator = commitValidators.shift();
            if (validator) {
                console.log('Running commit validator: ' + validator.name);
                validator.validate(sha, githubUser, statusHistory, repoClient, function(err, result) {
                    if (err) {
                        console.error('Error running commit validator "' + validator.name + '"');
                        console.error(err);
                        return;
                    }
                    console.log(validator.name + ' result was ' + result.state);
                    if (result.state !== 'success') {
                        // Upon failure, we set a flag that will skip the 
                        // remaining validators and post a failure status.
                        validationFailed = true;
                        postNewNupicStatus(sha, result, repoClient);
                    }
                    console.log(validator.name + ' complete... running next validator');
                    runNextValidation();
                });
            } else {
                // No more validators left in the array, so we can complete the
                // validation successfully.
                postNewNupicStatus(sha, {
                    state: 'success',
                    description: 'All validations passed (' + validators.map(function(v) { return v.name; }).join(', ') + ')'
                }, repoClient);
            }
        }

        console.log('Kicking off validation...');
        runNextValidation();

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
                revalidateAllOpenPullRequests(githubUser, contributors, repoClient);
            });
        }
    } else {
        performCompleteValidation(head.sha, githubUser, repoClient);
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
            performCompleteValidation(payload.sha, payload.sender.login, repoClient);
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
