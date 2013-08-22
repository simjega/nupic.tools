var assert = require('assert'),
    proxyquire = require('proxyquire'),
    shaValidator = require('./../utils/shaValidator.js')
    repoClientStub = {
        'getAllStatusesFor': function(sha, callback) { callback(null, 'fakeStatusHistory'); },
        'validators': {
            'excludes': []
        }
    },
    repoClientSecondStub = {
        'getAllStatusesFor': function(sha, callback) { callback(null, 'fakeStatusHistory'); },
        'validators': {
            'excludes': ['FirstValidator']
        }
    },
    validatorsStub = [
        {
            'name': 'FirstValidator',
            'priority': 1,
            'validate': function(sha, githubUser, statusHistory, repoClient, callback) { 
                assert.equal(sha, 'testSHA', 'in FirstValidator.validate :  wrong sha!');
                assert.equal(githubUser, 'carlfriess', 'in FirstValidator.validate :  wrong githubUser!');
                assert.equal(statusHistory, 'fakeStatusHistory', 'in FirstValidator.validate :  wrong statusHistory!');
                callback(null, {
                    'state': 'success',
                    'target_url': 'correctTargetURL'
                });
             }
        },
        {
            'name': 'SecondValidator',
            'priority': 0,
            'validate': function(sha, githubUser, statusHistory, repoClient, callback) { 
                assert.equal(sha, 'testSHA', 'in SecondValidator.validate :  wrong sha!');
                assert.equal(githubUser, 'carlfriess', 'in SecondValidator.validate :  wrong githubUser!');
                assert.equal(statusHistory, 'fakeStatusHistory', 'in SecondValidator.validate :  wrong statusHistory!');
                callback(null, {
                    'state': 'success',
                    'target_url': 'otherTargetURL'
                });
             }
        }
    ];

describe('shaValidator test', function() {
    it('Testing with two validators.', function() {
        shaValidator.performCompleteValidation('testSHA', 'carlfriess', repoClientStub, validatorsStub, false, function(sha, output, repoClient) {
            assert.equal(sha, 'testSHA', 'in shaValidator.performCompleteValidation :  wrong sha in output!');
            assert.equal(output.state, 'success', 'in shaValidator.performCompleteValidation :  wrong state in output :  Not success!');
            //assert.equal(output.target_url, 'correctTargetURL', 'in shaValidator.performCompleteValidation :  wrong target_url in output!');
            assert.equal(output.description, 'All validations passed (FirstValidator, SecondValidator)', 'in shaValidator.performCompleteValidation :  wrong description in output!');
        });
    });
    it('Testing with two validators. One configured to be excluded.', function() {
        shaValidator.performCompleteValidation('testSHA', 'carlfriess', repoClientSecondStub, validatorsStub, false, function(sha, output, repoClient) {
            assert.equal(sha, 'testSHA', 'in shaValidator.performCompleteValidation :  wrong sha in output!');
            assert.equal(output.state, 'success', 'in shaValidator.performCompleteValidation :  wrong state in output :  Not success!');
            assert.equal(output.target_url, 'otherTargetURL', 'in shaValidator.performCompleteValidation :  wrong target_url in output!');
            assert.equal(output.description, 'All validations passed (SecondValidator [1 skipped])', 'in shaValidator.performCompleteValidation :  wrong description in output!');
        });
    });
});