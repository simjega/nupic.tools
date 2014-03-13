var assert = require('assert');
    proxyquire = require('proxyquire'),
    utilStub = {
        initializeModulesWithin: function() {
            return 'validators to be used';
        }
    };


describe('github hook handler', function() {
    var validationPerformed = false,
        validatedSHA, validatedUser, validatorsUsed, validationPosted,
        githubHook = proxyquire('./../githubHook', {
            './utils/general': utilStub,
            './utils/shaValidator': {
                performCompleteValidation: function(sha, githubUser, _, validators, postStatus, cb) {
                    console.log(arguments);
                    validationPerformed = true;
                    validatedSHA = sha;
                    validatedUser = githubUser;
                    validatorsUsed = validators;
                    validationPosted = postStatus;
                    cb();
                }
            }
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
                    base: {label: 'label', ref: 'master'}
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

        validationPerformed = false;

        handler(mockRequest, mockResponse);

        assert(validationPerformed, 'validation against PR was not performed');
        assert.equal(validatedSHA, 'sha', 'validated wrong SHA');
        assert.equal(validatedUser, 'login', 'validated wrong user');
        assert.equal(validatorsUsed, 'validators to be used', 'used wrong validators');
        assert(validationPosted, 'validation status was not posted');
        assert(endCalled, 'request was not closed');

        // Reset just in case further tests use them.
        validationPerformed = undefined;
        validatedSHA = undefined;
        validatedUser = undefined;
        validatorsUsed = undefined;
        validationPosted = undefined;
    });
    
    // it('calls push handler when sent a push event', function() {});
    
    // it('calls status handler when sent a status event', function() {});
});