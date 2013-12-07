var assert = require('assert');
    proxyquire = require('proxyquire'),
    utilStub = {
        initializeModulesWithin: function() {}
    };


describe('github hook handler', function() {
    var githubHook = proxyquire('./../githubHook', {
            './utils/general': utilStub,
            './utils/shaValidator': {}
        }),
        mockClients = {'foo': true},
        handler = githubHook.initializer(mockClients, 'mockConfig');

    it('calls pr handler when sent a pull_request event', function() {
        var mockPayload = {
                name: 'foo',
                pull_request: {
                    action: 'closed',
                    user: {login: 'login'},
                    head: {sha: 'sha'},
                    base: {label: 'label', ref: 'ref'}
                }
            },
            mockRequest = {
                body: {
                    payload: JSON.stringify(mockPayload)
                }
            },
            endCalled = false,
            mockResponse = {
                end: function() {
                    endCalled = true;
                }
            };

        handler = githubHook.initializer(mockClients, 'mockConfig');

        handler(mockRequest, mockResponse);

        assert(endCalled, 'request was not closed');
    });
    
    // it('calls push handler when sent a push event', function() {});
    
    // it('calls status handler when sent a status event', function() {});
});