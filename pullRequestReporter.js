var url = require('url'),
    qs = require('querystring');

function renderJson(out, res) {
    res.setHeader('Content-Type', 'application/json');
    res.write(out);
}

function renderJsonP(out, cbName, res) {
    res.setHeader('Content-Type', 'application/javascript');
    res.write(cbName + '(' + out + ')');
}

module.exports = function(ghClient) {
    return function(req, res) {
        var reqUrl = url.parse(req.url),
        query = qs.parse(reqUrl.query);

        ghClient.getAllOpenPullRequests(function(err, prs) {
            // Attach current statuses to each request
            var out = [];

            function addNextPullRequestStatuses() {
                var pr = prs.pop();
                if (! pr) {
                    // Done!
                    out = JSON.stringify(out);
                    if (query.callback) {
                        renderJsonP(out, query.callback, res);
                    } else {
                        renderJson(out, res);
                    }
                } else {
                    ghClient.getAllStatusesFor(pr.head.sha, function(err, statuses) {
                        if (err) console.log(err);
                        pr.statuses = statuses;
                        out.push(pr);
                        addNextPullRequestStatuses();
                    });
                }
            }

            addNextPullRequestStatuses();
        });
    }
};