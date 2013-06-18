var GitHubApi = require("github"),
    GithubClient;

function GithubClient(user, password, org, repo) {
    var me = this;
    this.org = org;
    this.repo = repo;
    this.github = new GitHubApi({
        version: '3.0.0',
        timeout: 5000
    });
    console.log('GithubClient created for user ' + user);
    this.github.authenticate({
        type: 'basic',
        username: user,
        password: password
    });
}

GithubClient.prototype.merge = function(head, base, callback) {
    console.log('merging ' + head + ' into ' + base + '...');
    this.github.repos.merge({
        user: this.org,
        repo: this.repo,
        base: base,
        head: head
    }, callback);
};

GithubClient.prototype.isBehindMaster = function(sha, callback) {
    this.github.repos.compareCommits({
        user: this.org,
        repo: this.repo,
        base: 'master',
        head: sha
    }, function(err, data) {
        if (err) {
            callback(err);
        } else {
            callback(err, data.behind_by > 0);
        }
    });
};

GithubClient.prototype.getAllOpenPullRequests = function(callback) {
    this.github.pullRequests.getAll({
        user: this.org,
        repo: this.repo,
        state: 'open'
    }, callback);
};

GithubClient.prototype.getAllStatusesFor = function(sha, callback) {
    this.github.statuses.get({
        user: this.org,
        repo: this.repo,
        sha: sha
    }, function(err, statuses) {
        callback(err, (statuses || []));
    });
};

GithubClient.prototype.confirmWebhookExists = function(url, event, callback) {
    var me = this;
    console.log('Looking for ' + event + ' hook for ' + url + '...');
    this.github.repos.getHooks({
        user: this.org,
        repo: this.repo
    }, function(err, hooks) {
        var found = false;
        if (err) {
            return callback(err);
        }
        hooks.forEach(function(hook) {
            if (url == hook.config.url) {
                found = true;
            }
        });
        if (! found) {
            console.log('creating ' + event + ' hook for ' + url);
            me.github.repos.createHook({
                user: me.org,
                repo: me.repo,
                name: 'web', 
                config: {
                    url: url
                },
                events: ['pull_request', 'status']
            }, function(err, data) {
                if (err) {
                    return callback(err);
                }
                console.log('Web hook created: ');
                console.log(data);
            });
        } else {
            callback();
        }
    });
};

module.exports.GithubClient = GithubClient;
