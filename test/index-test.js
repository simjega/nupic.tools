var assert = require('assert'),
    proxyquire = require('proxyquire'),
    connectStub = {},
    utilStub,
    configReaderStub,
    githubHookSub;

utilStub = {
    sterilizeConfig: function(cfg) {
        return cfg;
    },
    constructRepoClients: function() {}
};
configReaderStub = {
    read: function() { return {host: 'host', port: 666}; }
};

describe('main program', function() {
    describe('when initially loaded', function() {
        it('sends the right config file to configReader', function() {
            proxyquire('./../program', {
                './utils/general': utilStub,
                './utils/configReader': {read: function(configPath) {
                    assert.equal(configPath, './conf/config.json', 'Wrong default configuration path.');
                    return {host: 'host', port: 666};
                }},
            });
        });
        it('constructs a proper github webhook url', function() {
            utilStub.constructRepoClients = function(prWebhook, cfg) {
                assert.equal(prWebhook, 'http://host:666/github-hook', 'Bad Github web hook url created');
            };
            proxyquire('./../program', {
                './utils/general': utilStub,
                './utils/configReader': configReaderStub
            });
        });
    });
});
