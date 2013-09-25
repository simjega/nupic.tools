var assert = require('assert'),
    githubClientStub = {
        org: 'dummyOrg',
        repo: 'dummyRepo'
    },
    validator = require('../../validators/travis')
    /* MOCK STATUSES */
    mockStatuses = [{
        url: 'https://api.github.com/repos/numenta/experiments/statuses/f6814f9ac4d2400fe26644d2def9f39a834cd701',
        id: 18251359,
        state: 'pending',
        description: 'NuPIC Status: The Travis CI build is in progress',
        target_url: 'https://travis-ci.org/numenta/experiments/builds/10384950',
        created_at: '2013-08-19T22:09:03Z',
        updated_at: '2013-08-19T22:09:03Z' 
    }, { 
        url: 'https://api.github.com/repos/numenta/experiments/statuses/f6814f9ac4d2400fe26644d2def9f39a834cd701',
        id: 18251789,
        state: 'success',
        description: 'The Travis CI build passed',
        target_url: 'https://travis-ci.org/numenta/experiments/builds/10384950',
        created_at: '2013-08-19T22:12:41Z',
        updated_at: '2013-08-19T22:12:41Z'
    }, { 
        url: 'https://api.github.com/repos/numenta/experiments/statuses/f6814f9ac4d2400fe26644d2def9f39a834cd701',
        id: 18251354,
        state: 'pending',
        description: 'The Travis CI build is in progress',
        target_url: 'https://travis-ci.org/numenta/experiments/builds/10384950',
        created_at: '2013-08-19T22:09:00Z',
        updated_at: '2013-08-19T22:09:00Z' 
    }];
    /* END MOCK STATUSES */

describe('contributor validator', function() {
    it('has a proper "name" property', function() {
        assert.equal(validator.name, 'Travis Validator', 'Wrong validator name');
    });
    it('returns a success status when the latest travis status is success', function(done) {
        validator.validate('sha', 'rhyolight', mockStatuses, githubClientStub, function(err, status) {
            assert.ifError(err, 'error thrown during validation');
            assert(status.state, 'no status state returned');
            assert.equal(status.state, 'success', 'wrong status state');
            done();
        });
    });
    it('returns a failure status when the latest travis status has been in progress for longer than 12 hours', function(done) {
        // make the last 'pending' status the most recent
        mockStatuses[2].created_at = '2013-08-20T22:09:00Z';
        validator.validate('sha', 'rhyolight', mockStatuses, githubClientStub, function(err, status) {
            assert.ifError(err, 'error thrown during validation');
            assert(status.state, 'no status state returned');
            assert.equal(status.state, 'failure', 'wrong status state');
            assert.equal(status.description, 'Travis CI build has been running for longer than 12 hours.', 'wrong description');
            done();
        });
    });
});
