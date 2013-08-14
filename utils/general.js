var fs = require('fs'),
    RepositoryClient = require('./repoClient');

/**
 * Reads all the JavaScript files within a directory, assuming they are all 
 * proper node.js modules, and loads them. 
 * @return {Array} Modules loaded.
 */
function initializeModulesWithin(dir) {
    var output = [];
    fs.readdirSync(dir).forEach(function(fileName) {
        if(fileName.charAt(0) != "." && fileName.substr(fileName.length - 3) == ".js")   {
            output.push(require('../' + dir + '/' + fileName.split('.').shift()));
        }
    });
    return output;
}

/**
 * Given the entire merged app configuration, constructs a map of RepositoryClient
 * objects, properly registering Github webhook handlers for each if they don't
 * have them yet.
 *
 * If an error occurs during communication with Github, the application startup
 * will fail.
 * 
 * @param {String} Pull request web hook URL to register with Github.
 * @param {Object} Application configuration.
 * @param {Function} Callback, to be sent a map of RepositoryClient objects, 
 * constructed using the "monitors" part of the configuration, keyed by Github 
 * "org/repo".
 */
function constructRepoClients(prWebhookUrl, config, callback) {
    var repoClients = {},
        count = 0;
    // Set up one github client for each repo target in config.
    Object.keys(config.monitors).forEach(function(monitorKey) {
        var monitorConfig = config.monitors[monitorKey],
            keyParts = monitorKey.split('/'),
            org = keyParts.shift(),
            repo = keyParts.shift(),
            repoClient;

        monitorConfig.organization = org;
        monitorConfig.repository = repo;

        repoClient = new RepositoryClient(monitorConfig);
        console.log('RepositoryClient created for ' 
            + monitorConfig.username.magenta + ' on ' 
            + repoClient.toString().magenta);

        repoClient.confirmWebhookExists(prWebhookUrl, ['pull_request', 'status'], function(err, hook) {
            if (err) {
                console.error(('Error during webhook confirmation for ' + repoClient.toString()).red);
                die(err);
            } else {
                if (hook) {
                    console.log(('Webhook created on ' + repoClient.toString() + ':\n'
                                            + '\tfor "' + hook.events.join(', ') + '"\n'
                                            + '\ton ' + hook.config.url).yellow);
                } else {
                    console.log(('Webhook exists for ' + repoClient.toString()).green);
                }
                count++;
            }
            repoClients[monitorKey] = repoClient;
            if (count == (Object.keys(config.monitors).length))  {
                callback(repoClients);
            }
        });
    });
}

/* Removes the passwords from the config for logging. */
function sterilizeConfig(config) {
    var out = JSON.parse(JSON.stringify(config));
    Object.keys(out.monitors).forEach(function(k) {
        if (out.monitors[k].password) {
            out.monitors[k].password = '<hidden>';
        }
    });
    return out;
}

module.exports = {
    initializeModulesWithin: initializeModulesWithin,
    constructRepoClients: constructRepoClients,
    sterilizeConfig: sterilizeConfig
};