var contributors = require('./contributors'),
    githubClient;

function isContributor(name, roster) {
    return roster.map(function(p) { return p.Github; })
                 .reduce(function(prev, curr) {
                    if (prev) return prev;
                    return curr == name;
                 }, false);
}

function validateSha(sha, contributors, callback) {
    console.log('Validating SHA "' + sha + '"');
    if (! isContributor(githubUser, contribs)) {
        githubClient.rejectPR(head.sha, 
            githubUser + ' has not signed the Numenta Contributor License',
            'http://numenta.com/licenses/cl/', callback);
    } else {
        // now we need to check to see if the commit is behind master
        githubClient.isBehindMaster(head.sha, function(err, behind) {
            if (behind) {
                githubClient.rejectPR(head.sha, 
                    'This PR needs to be fast-forwarded. ' + 
                    'Please merge master into it.', callback);
            } else {
                githubClient.approvePR(head.sha, callback);
            }
        });
    }
}

function revalidateAllOpenPullRequests(contributors) {
    githubClient.getAllOpenPullRequests(function(err, prs) {
        console.log('Found ' + prs.length + ' open pull requests...');
        prs.map(function(pr) { return pr.sha; }).forEach(function(sha) {
            validateSha(sha, contributors);
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
            console.log('Noticed a PR just merged... time to revalidate all the other pull requests!');
            if (payload.pull_request.merged) {
                revalidateAllOpenPullRequests();
            }
            return res.end();
        }

        contributors.getAll(function(err, contribs) {
            validateSha(head.sha, contribs);
        });

        res.end();
    };
};
