// MAIN PROGRAM, start here.

// global libs
var assert = require('assert'),
    fs = require('fs'),
    connect = require('connect'),
    colors = require('colors'),
    // local libs
    utils = require('./utils/general'),
    RepositoryClient = require('./utils/repoClient'),
    githubHookHandler = require('./githubHook'),
    // The configReader reads the given file, and merges it with any existing user
    // configuration file.
    cfg = require('./utils/configReader').read('./conf/config.json'),

    HOST = cfg.host,
    PORT = cfg.port || 8081,

    baseUrl = 'http://' + HOST + ':' + PORT,
    // This path is registered with Github as a webhook URL.
    githubHookPath = '/github-hook',
    prWebhookUrl = baseUrl + githubHookPath,

    // This directory contains all the additional service
    // handlers that will be loaded dynamically and attached
    // to this web server.
    HANDLER_DIR = './handlers';

/* Logs error and exits. */
function die(err) {
    console.error(err);
    process.exit(-1);
}

/**
 * Given the entire merged app configuration, constructs a map of RepositoryClient
 * objects, properly registering Github webhook handlers for each if they don't
 * have them yet.
 *
 * If an error occurs during communication with Github, the application startup
 * will fail.
 * 
 * @param {Object} Application configuration.
 * @param {Function} Callback, to be sent a map of RepositoryClient objects, 
 * constructed using the "monitors" part of the configuration, keyed by Github 
 * "org/repo".
 */
function constructRepoClients(config, callback) {
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

console.log('nupic.tools server starting...'.green);
console.log('nupic.tools will use the following configuration:');
console.log(JSON.stringify(sterilizeConfig(cfg), null, 2).yellow);

constructRepoClients(cfg, function(repoClients) {
    var dynamicHttpHandlerModules,
        // The Connect JS application
        app = connect();

    // Enable a log of logging.
    app.use(connect.logger('dev'))
       // Auto body parsing is nice.
       .use(connect.bodyParser())
       // This puts the Github webhook handler into place
       .use(githubHookPath, githubHookHandler(repoClients));

    dynamicHttpHandlerModules = utils.initializeModulesWithin(HANDLER_DIR);

    // Loads all the modules within the handlers directory, and registers the URLs
    // the declared, linked to their request handler functions.
    dynamicHttpHandlerModules.forEach(function(handlerConfig) {
        var urls = Object.keys(handlerConfig);
        urls.forEach(function(url) {
            var handler = handlerConfig[url](repoClients, dynamicHttpHandlerModules, cfg),
                name = handler.name,
                desc = handler.description,
                msg = '==> ' + name + ' listening for url pattern: ' + url;
            if (! handler.disabled) {
                console.log(msg.cyan);
                app.use(url, handler);
            }
        });
    });
        
    app.listen(PORT, function() {
        console.log(('\nServer running at ' + baseUrl + '\n').green);
    });

});
