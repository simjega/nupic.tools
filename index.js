var assert = require('assert'),
    connect = require('connect'),
    colors = require('colors'),
    
    RepositoryClient = require('./repoClient'),
    contributors = require('./contributors'),
    githubHookHandler = require('./githubHook'),
    statusReporter = require('./statusReporter'),
    pullRequestReporter = require('./pullRequestReporter'),
    cfg = require('./configReader').read(),

    HOST = cfg.host,
    PORT = cfg.port || 8081,

    baseUrl = 'http://' + HOST + ':' + PORT,
    githubHookPath = '/github-hook',
    statusReportPath = '/shaStatus',
    pullRequestReportPath = '/prStatus',
    pullRequestWebhookUrl = baseUrl + githubHookPath,

    repoClients = {},

    channelName = 'nupic';

function die(err) {
    console.error(err);
    process.exit(-1);
}

function establishWebHooks(config, callback) {
    var count = 0;
    // Set up one github client for each repo target in config.
    Object.keys(config.monitors).forEach(function(monitorKey) {
        var monitorConfig = config.monitors[monitorKey],
            keyParts = monitorKey.split('/'),
            org = keyParts.shift(),
            repo = keyParts.shift(),
            repoClient;

        monitorConfig.organization = org;
        monitorConfig.repository = repo;

        repoClient = new RepositoryClient(monitorConfig);

        repoClient.confirmWebhookExists(pullRequestWebhookUrl, 'pull_request', function(err) {
            if (err) {
                console.error(('Error during webhook confirmation for ' + repoClient.toString()).red);
                die(err);
            } else {
                console.log(('Webhook for ' + repoClient.toString() + ' confirmed.').green);
                count++;
            }
            repoClients[monitorKey] = repoClient;
            if (count == (Object.keys(config.monitors).length))  {
                callback();
            }
        });
    });
}

console.log('nupic.tools server starting...'.green);
console.log('nupic.tools will use the following configuration:');
console.log(JSON.stringify(cfg, null, 2).yellow);

establishWebHooks(cfg, function() {

    connect()
        .use(connect.logger('dev'))
        .use(connect.bodyParser())
        .use(githubHookPath, githubHookHandler(repoClients))
        .use(statusReportPath, statusReporter(repoClients))
        .use(pullRequestReportPath, pullRequestReporter(repoClients))

        // Simple report on what this server is monitoring.
        .use('/', function(req, res) {
            var repoList = '<ul>';
            var itemHtml = Object.keys(repoClients).map(function(key) {
                return '<a target="_blank" href="http://github.com/' + key + '/">http://github.com/' + key + '</a>';
            });
            repoList += '<li>' + itemHtml.join('</li><li>') + '</li></ul>';
            res.setHeader('Content-Type', 'text/html');
            res.end('<html><body>\n<h1>nupic.tools is alive</h1>\n' 
                + '<h3>This server is monitoring the following repositories:</h3>'
                + repoList + '\n</body></html>');
        })
        
        .listen(PORT, function() {
            console.log(('\nServer running at ' + baseUrl + '\n').green);
        });

});
