var url = require('url'),
    qs = require('querystring'),

    repoClients;

function renderJson(out, res) {
    res.setHeader('Content-Type', 'application/json');
    res.end(out);
}

function renderJsonP(out, cbName, res) {
    res.setHeader('Content-Type', 'application/javascript');
    res.end(cbName + '(' + out + ')');
}

function getPullRequestsFrom(ghClient, callback) {
    ghClient.getAllOpenPullRequests(function(err, prs) {
        // Attach current statuses to each request
        var out = [];

        function addNextPullRequestStatuses() {
            var pr = prs.pop();
            if (! pr) {
                // Done!
                callback(null, out);
            } else {
                ghClient.getAllStatusesFor(pr.head.sha, function(err, statuses) {
                    if (err) return callback(err);
                    pr.statuses = statuses;
                    out.push(pr);
                    addNextPullRequestStatuses();
                });
            }
        }

        addNextPullRequestStatuses();
    });
}

function prReporter(req, res) {
    var reqUrl = url.parse(req.url),
        query = qs.parse(reqUrl.query),
        allPrs = {},
        repoKeys = Object.keys(repoClients),
        totalReposToQuery = Object.keys(repoClients).length;

    if (query.repo) {
        repoKeys = [query.repo];
        totalReposToQuery = 1;
    }

    console.log(repoKeys);

    repoKeys.forEach(function(repoName) {
        var client = repoClients[repoName];
        getPullRequestsFrom(client, function(err, prs) {
            if (err) throw err;
            allPrs[client.toString()] = prs;
            if (Object.keys(allPrs).length == totalReposToQuery) {
                // Done!
                var out = totalReposToQuery == 1 ? allPrs[Object.keys(allPrs)[0]] : allPrs;
                out = JSON.stringify(out);
                if (query.callback) {
                    renderJsonP(out, query.callback, res);
                } else {
                    renderJson(out, res);
                }
            }
        });
    });
}

prReporter.name = 'Pull Request Reporter';
prReporter.description = 'Returns a report of all open pull requests for each monitored repository. Supports JSON and JSONP.';

module.exports = {
    '/prStatus': function(_repoClients) {
        repoClients = _repoClients;
        return prReporter;
    }
};