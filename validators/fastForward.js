function validator(sha, githubUser, statusHistory, githubClient, callback) {
    // now we need to check to see if the commit is behind master
    githubClient.isBehindMaster(sha, function(err, isBehind, behindBy) {
        var result = {
            state: 'success'
        };
        if (err) {
            result.state = 'failure';
            result.description = 'This commit does not seem to be on the same tree as master.';
        } else if (isBehind) {
            result.state = 'failure';
            result.description = 'You must merge ' + behindBy 
                + ' commits from the destination branch.';
        }
        callback(null, result);
    });

}

module.exports.validate = validator;
module.exports.name = 'Fast-Forward Validator';
