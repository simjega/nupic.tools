var fs = require('fs'),
    url = require('url'),
    qs = require('querystring'),
    shaValidator = require('../utils/shaValidator'),
    jsonUtils = require('../utils/json'),
    VALIDATOR_DIR = './validators',
    validators = [],
    repoClients;

function initializeValidators(dir) {
    fs.readdirSync(dir).forEach(function(validator) {
        validators.push(require('.' + dir + '/' + validator.split('.').shift()));
    });
}

function findClientFor(sha, callback) {
    var clients = Object.keys(repoClients),
        found = false;
    function next() {
        var nextClient;
        if (found) return;
        nextClient = repoClients[clients.shift()];
        if (! nextClient) {
            return callback();
        }
        nextClient.getCommit(sha, function(err, commit) {
            if (! err && commit) {
                found = true;
                callback(nextClient, commit);
            } else {
                next();
            }
        });
    }
    next();
}



function validateSha(req, res) {

    var reqUrl = url.parse(req.url),
        query = qs.parse(reqUrl.query),
        sha = query.sha,
        repo = query.repo,
        jsonPCallback = query.callback,
        repoClient = repoClients[repo],
        errors = [];

    if (! sha) {
        errors.push(new Error('Missing "sha" query parameter.'));
    }
    if (errors.length) {
        return jsonUtils.renderErrors(errors, res, jsonPCallback);
    }

    findClientFor(sha, function(client, payload) {
        var committer;
        if (! client) {
            errors.push(new Error('No match for sha "' + sha + '" in any known repositories.'));
            return jsonUtils.renderErrors(errors, res, jsonPCallback);
        }
        committer = payload.author ? payload.author.login : false;
        shaValidator(sha, committer, client, validators, function (sha, statusDetails, repoClient) {
            var htmlOut = '<html><body>\n<h1>SHA Validation report</h1>\n';
            htmlOut += '<h2>' + repoClient.toString() + '</h2>\n';
            htmlOut += '<h2>' + sha + '</h2>\n';
            htmlOut += '<h3>' + statusDetails.state + '</h3>\n';
            htmlOut += '<p>' + statusDetails.description + '</p>\n';
            if (statusDetails.target_url) {
                htmlOut += '<p><a href="' + statusDetails.target_url + '">Details</a></p>\n';
            }
            htmlOut += '\n</body></html>';
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Content-Length', htmlOut.length);
            res.end(htmlOut);
        });
    });

}

validateSha.name = 'SHA Validator';
validateSha.description = 'Given a sha parameter, forces a complete validation and reports results.';

module.exports = {
    '/validate': function(_repoClients) {
        initializeValidators(VALIDATOR_DIR);
        repoClients = _repoClients;
        return validateSha;
    }
};