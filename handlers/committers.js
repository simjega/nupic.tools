var GitHubApi = require('github'),
    json = require('../utils/json'),
    committerTeamId = 418155,
    gh;

function requestHandler(req, res) {
    gh.orgs.getTeamMembers({id: committerTeamId}, function(err, members) {
        if (err) {
            json.renderErrors(err, res);
        } else {
            json.render(members, res);
        }
    });
}

function initializer(_repoClients, _httpHandlers, config, activeValidators) {
    var ghUsername = config.monitors['numenta/nupic'].username,
        ghPassword = config.monitors['numenta/nupic'].password;
    gh = new GitHubApi({
        version: '3.0.0',
        timeout: 5000
    });
    gh.authenticate({
        type: 'basic',
        username: ghUsername,
        password: ghPassword
    });
    return requestHandler;
}

requestHandler.title = 'Committer Reporter';
requestHandler.description = 'Reports committer details.';
requestHandler.url = '/committers';

module.exports = {
    '/committers*': initializer
};
