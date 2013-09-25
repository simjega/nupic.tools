var TRAVIS_DESC_TOKEN = 'The Travis CI build',
    TRAVIS_THRESHOLD = 12, // hours
    utils = require('../utils/general');

function getLatestTravisStatus(list) {
    var i = 0;
    for (; i<list.length; i++) {
        if (list[i].description.indexOf(TRAVIS_DESC_TOKEN) >= 0) {
            return list[i];
        }
    }
}

function validator(sha, githubUser, statusHistory, githubClient, callback) {
    var sortedStatuses = utils.sortStatuses(statusHistory),
        tstatus = getLatestTravisStatus(statusHistory),
        lastUpdated,
        timestampDiff,
        hoursSinceLastUpdated;

    if (tstatus) {
        lastUpdated = new Date(tstatus.updated_at),
        timestampDiff = new Date().getTime() - lastUpdated.getTime(),
        hoursSinceLastUpdated = timestampDiff / (1000 * 60 * 60);
        
        if (tstatus.state == 'pending' && hoursSinceLastUpdated > TRAVIS_THRESHOLD) {
            // When Travis has been running and pending for too long, we should report
            // a failure. This is most likely an error state.
            callback(null, {
                state: 'failure',
                description: 'Travis CI build has been running for longer than ' + TRAVIS_THRESHOLD + ' hours.',
                target_url: tstatus.target_url
            });
        } else {
            // All other states of the Travis build can be used directly
            callback(null, tstatus);
        }
    } else {
        // When Travis has not started a build, we report 'pending'.
        callback(null, {
            state: 'pending',
            description: 'Travis CI build has not started.',
            target_url: 'https://travis-ci.org/' + githubClient.org + '/' + githubClient.repo
        });
    }
}

module.exports.validate = validator;
module.exports.name = 'Travis Validator';
module.exports.priority = 1;