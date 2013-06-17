function validator(pullRequest, statusHistory, githubClient, callback) {
    var sha = pullRequest.head.sha;
    // now we need to check to see if the commit is behind master
    githubClient.isBehindMaster(sha, function(err, behind) {
        var result = {
            state: 'success'
        };
        if (err) return callback(err);
        if (behind) {
            result.state = 'failure';
            result.description = 'This PR needs to be fast-forwarded. ' + 
                'Please merge master into it.';
        }
        callback(null, result);
    });

}

module.exports.validate = validator;
module.exports.name = 'Fast-Forward Validator';
