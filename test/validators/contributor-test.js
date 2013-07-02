var assert = require('assert'),
    proxyquire = require('proxyquire'),
    contribStub = {},
    contributor = proxyquire('../../commitValidators/contributor', 
                    {'contributors': contribStub});

contribStub.getAll = function(cb) {
    cb(null, {"contributors":
        [
            {
                "Name":"Matthew Taylor",
                "Github":"rhyolight",
                "Email":"matt@numenta.org",
                "Committer":1,
                "Reviewer":1,
                "Subscriber":1
            }
        ]
    });
};

describe('contributor validator', function() {
    it('has a proper "name" property', function() {
        assert.equal(contributor.name, 'Contributor Validator', 'Wrong commit validator name');
    });
    it('returns success state when user exists', function(done) {
        contributor.validate('sha', 'rhyolight', null, null, function(err, status) {
            assert.ifError(err, 'error thrown during validation');
            assert(status.state, 'no status state returned');
            assert.equal(status.state, 'success', 'wrong status state');
            done();
        });
    });
    it('returns failure status when user does not exist', function(done) {
        contributor.validate('sha', 'NOPE', null, null, function(err, status) {
            assert.ifError(err, 'error thrown during validation');
            assert(status.state, 'no status state returned');
            assert.equal(status.state, 'failure', 'wrong status state');
            assert.equal(status.description, 'NOPE has not signed the Numenta Contributor License');
            assert.equal(status.target_url, 'http://numenta.com/licenses/cl/')
            done();
        });
    });
});