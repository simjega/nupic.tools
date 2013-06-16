var NUPIC_STATUS_PREFIX = 'NuPIC Status:',
    contributors = require('./contributors'),
    githubClient;

function isContributor(name, roster) {
    return roster.map(function(p) { return p.Github; })
                 .reduce(function(prev, curr) {
                    if (prev) return prev;
                    return curr == name;
                 }, false);
}

function postTravisValidation(sha, githubUser, contributors, callback) {
    console.log('Validating Nupic requirements on ' + sha);
    if (! isContributor(githubUser, contributors)) {
        githubClient.rejectPR(sha, 
            githubUser + ' has not signed the Numenta Contributor License',
            'http://numenta.com/licenses/cl/', callback);
    } else {
        // now we need to check to see if the commit is behind master
        githubClient.isBehindMaster(sha, function(err, behind) {
            if (behind) {
                githubClient.rejectPR(sha, 
                    'This PR needs to be fast-forwarded. ' + 
                    'Please merge master into it.', null, callback);
            } else {
                githubClient.approvePR(sha, callback);
            }
        });
    }
}

function revalidateAllOpenPullRequests(githubUser, contributors) {
    githubClient.getAllOpenPullRequests(function(err, prs) {
        console.log('Found ' + prs.length + ' open pull requests...');
        prs.map(function(pr) { return pr.sha; }).forEach(function(sha) {
            performCompleteValidation(sha, githubUser);
        });
    });
}

function getAllStatuses(sha, callback) {
    githubClient.github.statuses.get({
        user: githubClient.org,
        repo: githubClient.repo,
        sha: sha
    }, callback);
}

function searchStatusListForDecription(list, description) {
    var i = 0;
    for (; i<list.length; i++) {
        if (list[i].description.indexOf(description) == 0) {
            return list[i];
        }
    }
}

function getLatestTravisStatus(list) {
    return searchStatusListForDecription(list, 'The Travis CI build');
}

function getLatestNupicStatus(list) {
    return searchStatusListForDecription(list, NUPIC_STATUS_PREFIX);
}

function performCompleteValidation(sha, githubUser) {
    console.log('VALIDATING ' + sha);

    getAllStatuses(sha, function(err, statusHistory) {
        if (err) throw err;

        var tstatus = getLatestTravisStatus(statusHistory);
        var nstatus = getLatestNupicStatus(statusHistory);

        if (! tstatus) {
            // fail because no travis build has run
            githubClient.pendingPR(sha, 
                'Travis CI build has not started.', 
                'https://travis-ci.org/' + githubClient.org 
                    + '/' + githubClient.repo);
        } else if (tstatus.state == 'success') {
            console.log('...last travis build was successful');
            // run further validation on contributor
            if (! nstatus) {
                console.log('no nupic validation has occurred on ' + sha);
                // Nupic has never validated this sha, so run validation
                contributors.getAll(function(err, contributors) {
                    postTravisValidation(sha, githubUser, contributors);
                });
            } else {
                // If there is a nupic status and a travis status, we want to
                // check that the nupic status is newer. The nupic status is 
                // the one we always want to be up front.
                if (new Date(nstatus.updated_at) > new Date(tstatus.updated_at)) {
                    // nupic status is newer, which is what we want
                    console.log('Latest nupic status is valid. No change required.');
                } else {
                    // re-run the nupic validation
                    console.log('Latest nupic status is out of date, rerunning...');
                    contributors.getAll(function(err, contributors) {
                        postTravisValidation(sha, githubUser, contributors);
                    });
                }
            }

        } else if (tstatus.state == 'pending') {
            // do nothing until we're notified of a new status after the build
            // is complete
        } else {
            // travis failed or errored out
            githubClient.rejectPR(sha,
                'Travis CI build failed!', 
                tstatus.target_url);
        }
    });
}

function handlePullRequest(payload) {
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
            contributors.getAll(function(err, contributors) {
                revalidateAllOpenPullRequests(githubUser, contributors);
            });
        }
    } else {
        performCompleteValidation(head.sha, githubUser);
    }
}

function handleStateChange(payload) {
    console.log('State of ' + payload.sha + ' updated to ' + payload.state);
    // Get statuses and check the latest one
    getAllStatuses(payload.sha, function(err, statusHistory) {
        var latestStatus = statusHistory[0];
        if (latestStatus.description.indexOf(NUPIC_STATUS_PREFIX) == 0) {
            // ignore statuses that were created by this server
        } else {
            performCompleteValidation(payload.sha, payload.pull_request.user.login);
        }
    });
}

module.exports = function(client) {
    githubClient = client;
    return function(req, res) {
        var payload = JSON.parse(req.body.payload);

        if (payload.state) {
            handleStateChange(payload);
        } else {
            handlePullRequest(payload);
        }

        res.end();

    };
};
