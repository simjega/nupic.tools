var connect = require('connect'),
    
    gh = require('./githubClient'),
    travis = require('./travis'),
    contributors = require('./contributors'),
    githubPullRequest = require('./prhandler'),
    chatlogs = require('./chatlogs'),
    cfg = require('./configReader').read(),

    HOST = cfg.host,
    PORT = cfg.port || 8081,

    pullRequestWebhookUrl = 'http://' + HOST + ':' + PORT + '/pullrequest',

    githubClient,

    // not using this yet
    // logDirectory = '~/Desktop/nupic/chatlogs',
    
    channelName = 'nupic';

if (! cfg.travis.token || ! cfg.github.username || ! cfg.github.password || 
    ! cfg.github.organization || ! cfg.github.repository) {
    console.error('The following values are required in the config.json or config-' + process.env.USER + '.json file:\n' +
        '\t- travis.token\n' +
        '\t- github.username\n' +
        '\t- github.password\n' +
        '\t- github.organization\n' +
        '\t- github.repository');
    process.exit(-1);
}

githubClient = new gh.GithubClient(
    cfg.github.username, 
    cfg.github.password, 
    cfg.github.organization, 
    cfg.github.repository);

githubClient.confirmWebhookExists(pullRequestWebhookUrl, 'pull_request', function(err) {
    if (err) {
        console.log('Error during webhook confirmation');
        console.error(err);
    } else {
        console.log('Webhook confirmed.');
    }
});

connect()
    .use(connect.logger('dev'))
    .use(connect.bodyParser())
    .use('/contributors', contributors.requestHandler)
    .use('/travis', travis(cfg.travis.token, githubClient))
    .use('/pullrequest', githubPullRequest(githubClient))
    .use('/chatlogs', chatlogs(logDirectory, channelName))
    .use('/', function(req, res) {
        res.setHeader('Content-Type', 'text/html');
        res.end('<html><body>nupic.tools is alive</body></html>');
    })
    .listen(PORT);
