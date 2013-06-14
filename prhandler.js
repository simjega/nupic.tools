

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
        githubClient.prPending(head.sha);
        if (user == 'rhyolight') {
            // githubClient.rejectPR();
        }
        res.end();
    };
};
