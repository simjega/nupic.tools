var url = require('url');

module.exports = function(ghClient) {
    return function(req, res) {
        var sha = url.parse(req.url).pathname.substr(1);
        ghClient.github.statuses.get({
            user: ghClient.org,
            repo: ghClient.repo,
            sha: sha
        }, function(err, statuses) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(statuses));
        });
    }
};