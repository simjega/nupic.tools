var contributors = require('./contributors');

module.exports = function(githubClient) {
    return function(req, res) {
        var payload = JSON.parse(req.body.payload),
            action = payload.action,
            githubUser = payload.pull_request.user.login,
            head = payload.pull_request.head,
            base = payload.pull_request.base;
        console.log('Received pull request "' + action + '" from ' + githubUser);
        // console.log('from:');
        // console.log(head);
        // console.log('to:');
        // console.log(base);
        
        contributors.getAll(function(err, contribs) {
            if (isNotContributor(githubUser, contribs)) {
                githubClient.rejectPR(
                    head.sha, 
                    githubUser + ' has not signed the Numenta Contributor License',
                    'http://numenta.com/licenses/cl/contributors.html');
            } else {
                githubClient.approvePR(head.sha, 'PR requester has signed the Numenta Contributor License');
            }
        });

/*
        if (githubUser == 'rhyolight') {
            githubClient.rejectPR(head.sha, 'rhyolight is not allowed to submit PRs');
        }
        githubClient.prPending(head.sha, function(err) {
            if (err) {
                return console.error(err);
            }
            if (githubUser == 'rhyolight') {
                githubClient.rejectPR(head.sha, 'rhyolight is not allowed to submit PRs');
            }
        });
*/
        res.end();
    };
};
