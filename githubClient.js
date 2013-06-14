var GitHubApi = require("github"),
    GithubClient,
    prUrl = 'http://issues.numenta.org:8081/pullrequest';

function GithubClient(user, password, org, repo) {
    var me = this;
    this.org = org;
    this.repo = repo;
    this.github = new GitHubApi({
        version: "3.0.0",
        timeout: 5000
    });
    console.log('GithubClient created for user ' + user);
    this.github.authenticate({
        type: "basic",
        username: user,
        password: password
    });
    this.confirmWebhookExists(prUrl, 'pull_request', function(err) {
        if (err) {
            console.log('Error during webhook confirmation');
            console.error(err);
        } else {
            console.log('Webhook confirmed.');
        }
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
        callback(err, data.behind_by > 0);
    });
};

GithubClient.prototype.approvePR = function(sha, callback) {
    console.log('Approving ' + sha);
    this.github.statuses.create({
        user: this.org,
        repo: this.repo,
        sha: sha,
        state: 'success',
        description: 'nupic.tools approves this pull request.'
    }, callback);
};

GithubClient.prototype.rejectPR = function(sha, reason, url, callback) {
    console.log('Rejecting ' + sha + ' because ' + reason);
    this.github.statuses.create({
        user: this.org,
        repo: this.repo,
        sha: sha,
        state: 'failure',
        description: reason,
        target_url: url
    }, callback);
};

GithubClient.prototype.prPending = function(sha, callback) {
    console.log('Marking ' + sha + ' as pending...');
    this.github.statuses.create({
        user: this.org,
        repo: this.repo,
        sha: sha,
        state: 'pending',
        description: 'Checking user and PR merge status...'
    }, callback);
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
        console.log('And did it exist? ' + found);
        if (! found) {
            console.log('creating ' + event + ' hook for ' + url);
            me.github.repos.createHook({
                user: me.org,
                repo: me.repo,
                name: 'web', 
                config: {
                    url: url
                },
                events: ['pull_request']
            }, function(err, data) {
                if (err) {
                    return callback(err);
                }
                console.log('Web hook created: ');
                console.log(data);
            });
        }
    });
};

module.exports.GithubClient = GithubClient;
