var connect = require('connect'),
    gh = require('./githubClient'),
    travis = require('./travis'),
    contributors = require('./contributors'),
    githubPullRequest = require('./prhandler'),
    TRAVIS_TOKEN = process.env.TRAVIS_TOKEN,
    GH_USERNAME = process.env.GH_USERNAME,
    GH_PASSWORD = process.env.GH_PASSWORD,
    GH_ORG = 'numenta',
    GH_REPO = 'nupic',
    githubClient;

if (! TRAVIS_TOKEN || ! GH_USERNAME || ! GH_PASSWORD) {
    console.error('You must set the following environment variables:\n' +
        '\t- TRAVIS_TOKEN\n' +
        '\t- GH_USERNAME\n' +
        '\t- GH_PASSWORD');
    process.exit(-1);
}

githubClient = new gh.GithubClient(GH_USERNAME, GH_PASSWORD, GH_ORG, GH_REPO);

connect()
    .use(connect.logger('dev'))
    .use(connect.bodyParser())
    .use('/contributors', contributors.requestHandler)
    .use('/travis', travis(TRAVIS_TOKEN, githubClient))
    .use('/pullrequest', githubPullRequest(githubClient))
    .use('/', function(req, res) {
        res.setHeader('Content-Type', 'text/html');
        res.end('<html><body>nupic.tools is alive</body></html>');
    })
    .listen(8081);
