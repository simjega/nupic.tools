var NUPIC_STATUS_PREFIX = 'NuPIC Status:',
    contributors = require('./contributors'),
    validators = [],
    githubClients;

validators.push(require('./commitValidators/travis'));
validators.push(require('./commitValidators/contributor'));
validators.push(require('./commitValidators/fastForward'));

function revalidateAllOpenPullRequests(githubUser, contributors, githubClient) {
    githubClient.getAllOpenPullRequests(function(err, prs) {
        console.log('Found ' + prs.length + ' open pull requests...');
        prs.map(function(pr) { return pr.head.sha; }).forEach(function(sha) {
            performCompleteValidation(sha, githubUser, githubClient);
        });
    });
}

function postNewNupicStatus(sha, statusDetails, githubClient) {
    console.log('Posting new NuPIC Status (' + statusDetails.state + ') to github for ' + sha);
    githubClient.github.statuses.create({
        user: githubClient.org,
        repo: githubClient.repo,
        sha: sha,
        state: statusDetails.state,
        description: 'NuPIC Status: ' + statusDetails.description,
        target_url: statusDetails.target_url
    });
}

function performCompleteValidation(sha, githubUser, githubClient) {

    console.log('\nVALIDATING ' + sha);

    githubClient.getAllStatusesFor(sha, function(err, statusHistory) {
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
                validator.validate(sha, githubUser, statusHistory, githubClient, function(err, result) {
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
                        postNewNupicStatus(sha, result, githubClient);
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
                }, githubClient);
            }
        }

        console.log('Kicking off validation...');
        runNextValidation();

    });
}

function handlePullRequest(payload, githubClient) {
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
            contributors.getAll(githubClient.contributorsUrl, function(err, contributors) {
                revalidateAllOpenPullRequests(githubUser, contributors, githubClient);
            });
        }
    } else {
        performCompleteValidation(head.sha, githubUser, githubClient);
    }
}

function handleStateChange(payload, githubClient) {
    console.log('State of ' + payload.sha + ' updated to ' + payload.state);
    // Get statuses and check the latest one
    githubClient.getAllStatusesFor(payload.sha, function(err, statusHistory) {
        var latestStatus = statusHistory[0];
        if (latestStatus.description.indexOf(NUPIC_STATUS_PREFIX) == 0) {
            // ignore statuses that were created by this server
        } else {
            performCompleteValidation(payload.sha, payload.sender.login, githubClient);
        }
    });
}

function getGithubClientForRequest(payload) {
    var repo = payload.name || payload.repository.full_name;
    return githubClients[repo];
}

module.exports = function(clients) {
    githubClients = clients;
    return function(req, res) {
        var payload = JSON.parse(req.body.payload),
            githubClient = getGithubClientForRequest(payload);

        if (payload.state) {
            handleStateChange(payload, githubClient);
        } else {
            handlePullRequest(payload, githubClient);
        }

        res.end();

    };
};
