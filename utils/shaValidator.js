function coloredStatus(status) {
    if (status == 'success') {
        return status.green;
    } else if (status == 'pending') {
        return status.yellow;
    } else {
        return status.red;
    }
}

function postNewNupicStatus(sha, statusDetails, repoClient) {
    console.log('Posting new NuPIC Status (' + coloredStatus(statusDetails.state) + ') to github for ' + sha);
    repoClient.github.statuses.create({
        user: repoClient.org,
        repo: repoClient.repo,
        sha: sha,
        state: statusDetails.state,
        description: 'NuPIC Status: ' + statusDetails.description,
        target_url: statusDetails.target_url
    });
}

function performCompleteValidation(sha, githubUser, repoClient, validators, callback) {
    var postStatus = postNewNupicStatus;
    if (callback) postStatus = callback;

    console.log(('\nVALIDATING ' + sha).cyan);

    repoClient.getAllStatusesFor(sha, function(err, statusHistory) {
        if (err) throw err;
        // clone of the global validators array
        var commitValidators = validators.slice(0),
            validationFailed = false;

        function runNextValidation() {
            var validator;
            if (validationFailed) return;
            validator = commitValidators.shift();
            if (validator) {
                console.log('Running commit validator: ' + validator.name);
                validator.validate(sha, githubUser, statusHistory, repoClient, function(err, result) {
                    if (err) {
                        console.error('Error running commit validator "' + validator.name + '"');
                        console.error(err);
                        return postStatus(sha, {
                            state: 'error',
                            description: 'Error running commit validator "' + validator.name + '": ' + err.message 
                        }, repoClient);
                    }
                    console.log(validator.name + ' result was ' + coloredStatus(result.state));
                    if (result.state !== 'success') {
                        // Upon failure, we set a flag that will skip the 
                        // remaining validators and post a failure status.
                        validationFailed = true;
                        postStatus(sha, result, repoClient);
                    }
                    console.log(validator.name + ' complete.');
                    runNextValidation();
                });
            } else {
                console.log('Validation complete.');
                // No more validators left in the array, so we can complete the
                // validation successfully.
                postStatus(sha, {
                    state: 'success',
                    description: 'All validations passed (' + validators.map(function(v) { return v.name; }).join(', ') + ')'
                }, repoClient);
            }
        }

        console.log('Kicking off validation...');
        runNextValidation();

    });
}

module.exports = performCompleteValidation;