var assert = require('assert'),
    proxyquire = require('proxyquire').noCallThru();

describe('when triggering a new travis build', function() {
    var MockGithubApi = undefined,
        mockDependencies = undefined,
        RepoClient = undefined,
        repoClient = undefined;
    
    MockGithubApi = function() {
        var me = this;
        this.authenticate = function(cfg) {
            me.username = cfg.username;
            me.password = cfg.password;
        };
    };
    mockDependencies = {
        'github': MockGithubApi,
        'travis-ping': {
            ping: function(githubUser, githubPassword, repoSlug, cb) {
                assert.equal(githubUser, 'mockuser', 'Wrong GH username passed to travis-ping.');
                assert.equal(githubPassword, 'mockpass', 'Wrong GH password passed to travis-ping.');
                assert.equal(repoSlug, 'mockorg/mockrepo', 'Wrong repo slug passed to travis-ping.');
                assert(typeof(cb) == 'function', 'Callback was not a function');
                cb('travis response');
            }
        }
    };
    RepoClient = proxyquire('../../utils/repoClient', mockDependencies);
    repoClient = new RepoClient({
        username: 'mockuser',
        password: 'mockpass',
        organization: 'mockorg',
        repository: 'mockrepo'
    });
    
    describe('for one repository', function() {
        it('calls the travis-ping module properly', function() {
            repoClient.triggerTravis(function(err, resp) {
                console.log(resp);
                assert.equal(err, undefined, 'Should be no error.');
                assert.equal(resp, 'travis response', 'Got back bad travis ping response.');
            });
        });
    });
});
