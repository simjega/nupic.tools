var fs = require('fs'),
    _ = require('underscore'),
    assert = require('chai').assert,
    expect = require('chai').expect,
    should = require('chai').should(),
    proxyquire = require('proxyquire'),
    mockConfig,
    mockUserConfig,
    GH_USERNAME = process.env.GH_USERNAME,
    GH_PASSWORD = process.env.GH_PASSWORD,
    USER = process.env.USER;

// Prep the mock configs.
mockConfig = fs.readFileSync('test/mockData/mockConfig.json', 'utf-8');
mockUserConfig = fs.readFileSync('test/mockData/mockUserConfig.json', 'utf-8');

function clearConfigReaderRequireCache() {
    delete require.cache[require.resolve('../../utils/configReader')]
}


describe('configuration reader', function() {

    describe('when required', function() {
        it('throws error if GH_USERNAME is unset', function() {
            clearConfigReaderRequireCache();
            delete process.env.GH_USERNAME;
            expect(function() {
                require('../../utils/configReader');
            }).to.throw('Both GH_USERNAME and GH_PASSWORD environment variables are required for nupic.tools to run.\n' +
                    'These are necessary for making Github API calls.');
            process.env.GH_USERNAME = GH_USERNAME;
            clearConfigReaderRequireCache();
        });
        it('throws error if GH_PASSWORD is unset', function() {
            clearConfigReaderRequireCache();
            delete process.env.GH_PASSWORD;
            expect(function() {
                require('../../utils/configReader');
            }).to.throw('Both GH_USERNAME and GH_PASSWORD environment variables are required for nupic.tools to run.\n' +
                    'These are necessary for making Github API calls.');
            process.env.GH_PASSWORD = GH_PASSWORD;
            clearConfigReaderRequireCache();
        });
    });

    describe('when reading config file', function() {
        clearConfigReaderRequireCache();
        process.env.GH_USERNAME = 'mockghusername';
        process.env.GH_PASSWORD = 'mockghpassword';
        var mockFs = {
                existsSync: function(path) {
                    if (path == 'conf/mockconfig.json' || path == 'conf/mockconfig-testuser.json') {
                        return true;
                    } else {
                        assert.fail(path, 'test config path', 'Incorrect config path.');
                    }
                },
                readFileSync: function(path) {
                    if (path == 'conf/mockconfig.json') {
                        return mockConfig;
                    } else if (path == 'conf/mockconfig-testuser.json') {
                        return mockUserConfig;
                    } else {
                        assert.fail(path, 'test config path', 'Incorrect config path.');
                    }
                }
            },
            reader = proxyquire('../../utils/configReader', {
                fs: mockFs
            });

        it('injects Github username/password into monitor configurations', function() {
            process.env.USER = 'testuser';
            var config = reader.read('conf/mockconfig.json');
            expect(config.monitors).to.include.keys(['numenta/experiments', 'numenta/nupic']);
            _.each(['numenta/experiments', 'numenta/nupic'], function(projectKey) {
                expect(config.monitors[projectKey]).to.include.keys(['username', 'password']);
                expect(config.monitors[projectKey].username).to.equal('mockghusername');
                expect(config.monitors[projectKey].password).to.equal('mockghpassword');
            });
            process.env.USER = USER;
        });

        process.env.USER = USER;
        process.env.GH_USERNAME = GH_USERNAME;
        process.env.GH_PASSWORD = GH_PASSWORD;
        clearConfigReaderRequireCache();
    });


});