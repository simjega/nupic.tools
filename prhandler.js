var contributors = require('./contributors'),
    githubClient;

function isContributor(name, roster) {
    return roster.map(function(p) { return p.Github; })
                 .reduce(function(prev, curr) {
                    if (prev) return prev;
                    return curr == name;
                 }, false);
}

function validateSha(sha, githubUser, contributors, callback) {
    console.log('Validating SHA "' + sha + '"');
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
                    'Please merge master into it.', callback);
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
            validateSha(sha, githubUser, contributors);
        });
    });
}

module.exports = function(client) {
    githubClient = client;
    return function(req, res) {
        var payload = JSON.parse(req.body.payload),
            action = payload.action,
            githubUser = payload.pull_request.user.login,
            head = payload.pull_request.head,
            base = payload.pull_request.base;

        console.log('Received pull request "' + action + '" from ' + githubUser);

        if (action == 'closed') {
            // if this pull request just got merged, we need to re-validate the
            // fast-forward status of all the other open pull requests
            if (payload.pull_request.merged) {
                console.log('Noticed a PR just merged... time to revalidate all the other pull requests!');
                contributors.getAll(function(err, contributors) {
                    revalidateAllOpenPullRequests(githubUser, contributors);
                });
            }
            return res.end();
        }

        contributors.getAll(function(err, contributors) {
            validateSha(head.sha, githubUser, contributors);
        });

        res.end();
    };
};
