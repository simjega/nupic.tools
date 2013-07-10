var TRAVIS_DESC_TOKEN = 'The Travis CI build';

function getLatestTravisStatus(list) {
    var i = 0;
    for (; i<list.length; i++) {
        if (list[i].description.indexOf(TRAVIS_DESC_TOKEN) == 0) {
            return list[i];
        }
    }
}

function validator(sha, githubUser, statusHistory, githubClient, callback) {
    var tstatus = getLatestTravisStatus(statusHistory);

    if (! tstatus) {
        // When Travis has not started a build, we report 'pending'.
        callback(null, {
            state: 'pending',
            description: 'Travis CI build has not started.',
            target_url: 'https://travis-ci.org/' + githubClient.org + '/' + githubClient.repo
        });
    } else {
        // All other states of the Travis build can be used directly
        callback(null, tstatus);
    }
}

module.exports.validate = validator;
module.exports.name = 'Travis Validator';