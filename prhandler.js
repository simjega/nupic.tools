var contributors = require('./contributors');

function isContributor(name, roster) {
    return roster.map(function(p) { return p.Github; })
                 .reduce(function(prev, curr) {
                    if (prev) return prev;
                    return curr == name;
                 }, false);
}

module.exports = function(githubClient) {
    return function(req, res) {
        var payload = JSON.parse(req.body.payload),
            action = payload.action,
            githubUser = payload.pull_request.user.login,
            head = payload.pull_request.head,
            base = payload.pull_request.base;

        console.log('Received pull request "' + action + '" from ' + githubUser);

        if (action == 'closed') {
            return res.end();
        }

        contributors.getAll(function(err, contribs) {
            if (! isContributor(githubUser, contribs)) {
                githubClient.rejectPR(head.sha, 
                    githubUser + ' has not signed the Numenta Contributor License',
                    'http://numenta.com/licenses/cl/');
            } else {
                // now we need to check to see if the commit is behind master
                githubClient.isBehindMaster(head.sha, function(err, behind) {
                    if (behind) {
                        githubClient.rejectPR(head.sha, 
                            'This PR needs to be fast-forwarded. ' + 
                            'Please merge master into it.');
                    } else {
                        githubClient.approvePR(head.sha);
                    }
                });
            }
        });

        res.end();
    };
};
