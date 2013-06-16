var connect = require('connect'),
    colors = require('colors'),
    $ = require('jquery'),
    
    gh = require('./githubClient'),
    contributors = require('./contributors'),
    githubHookHandler = require('./githubHook'),
    statusReporter = require('./statusReporter'),
    cfg = require('./configReader').read(),

    // not using this yet
    // chatlogs = require('./chatlogs'),

    HOST = cfg.host,
    PORT = cfg.port || 8081,

    baseUrl = 'http://' + HOST + ':' + PORT,
    githubHookPath = '/github-hook',
    statusReportPath = '/shaStatus',
    pullRequestWebhookUrl = baseUrl + githubHookPath,

    githubClient,

    // not using this yet
    // logDirectory = '~/Desktop/nupic/chatlogs',

    channelName = 'nupic';

console.log('nupic.tools server starting...'.green);

if (! cfg.github.username || ! cfg.github.password || 
    ! cfg.github.organization || ! cfg.github.repository) {
    console.error('The following values are required in the config.json or config-' + process.env.USER + '.json file:\n' +
        '\t- github.username\n' +
        '\t- github.password\n' +
        '\t- github.organization\n' +
        '\t- github.repository');
    process.exit(-1);
}

(function() {
    var cfgCopy = $.extend(true, {}, cfg, {github: {password: '<hidden>'}})
    console.log('nupic.tools will use the following configuration:');
    console.log(JSON.stringify(cfgCopy, null, 2).yellow);
}());

githubClient = new gh.GithubClient(
    cfg.github.username, 
    cfg.github.password, 
    cfg.github.organization, 
    cfg.github.repository);

githubClient.confirmWebhookExists(pullRequestWebhookUrl, 'pull_request', function(err) {
    if (err) {
        console.error('Error during webhook confirmation'.red);
        console.error(err);
    } else {
        console.log('Webhook confirmed.');
    }
});

connect()
    .use(connect.logger('dev'))
    .use(connect.bodyParser())
    .use('/contributors', contributors.requestHandler)
    .use(githubHookPath, githubHookHandler(githubClient))
    .use(statusReportPath, statusReporter(githubClient))
    // not using this yet
    // .use('/chatlogs', chatlogs(logDirectory, channelName))
    .use('/', function(req, res) {
        res.setHeader('Content-Type', 'text/html');
        res.end('<html><body>nupic.tools is alive</body></html>');
    })
    .listen(PORT, function() {
        console.log(('\nServer running at ' + baseUrl + '\n').green);
    });
