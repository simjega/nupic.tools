var contributors = require('../contributors');

function isContributor(name, roster) {
    return roster.map(function(p) { return p.Github; })
                 .reduce(function(prev, curr) {
                    if (prev) return prev;
                    return curr == name;
                 }, false);
}

function validator(sha, githubUser, _, githubClient, callback) {
    console.log('Validating contributor "' + githubUser + '"...');
    contributors.getAll(githubClient.contributorsUrl, function(err, contributors) {
        var response = {
            state: 'success',
        };
        if (err) return callback(err);
        if (! isContributor(githubUser, contributors)) {
            response.state = 'failure';
            response.description = githubUser + ' has not signed the Numenta Contributor License';
            response.target_url = 'http://numenta.com/licenses/cl/';
        }
        callback(null, response);
    });
}

module.exports.validate = validator;
module.exports.name = 'Contributor Validator';
