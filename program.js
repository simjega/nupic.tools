// MAIN PROGRAM, start here.

// global libs
var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    // ExpressJS and associated middleware
    express = require('express'),
    morgan = require('morgan'),
    bodyParser = require('body-parser'),

    log = require('./utils/log'),
    // local libs
    utils = require('./utils/general'),
    githubHookHandler = require('./githubHook'),
    // The configReader reads the given file, and merges it with any existing user
    // configuration file.
    cfg = require('./utils/configReader').read(path.join(__dirname, 'conf/config.json')),

    HOST = cfg.host,
    PORT = cfg.port || 8081,

    baseUrl = 'http://' + HOST + ':' + PORT,
    // This path is registered with Github as a webhook URL.
    githubHookPath = '/github-hook',
    prWebhookUrl = baseUrl + githubHookPath,

    // This directory contains all the additional service
    // handlers that will be loaded dynamically and attached
    // to this web server.
    HANDLER_DIR = 'handlers';

log.info('nupic.tools server starting...');
log('nupic.tools will use the following configuration:');
log.verbose(JSON.stringify(utils.sterilizeConfig(cfg), null, 2));

utils.constructRepoClients(prWebhookUrl, cfg, function(repoClients) {
    var dynamicHttpHandlerModules,
        activeValidators,
        app = express(),
        padInt = utils.padInt,
        padDecimal = utils.padDecimal;

    // Print the time of the request to the millisecond.
    app.use(function(req, res, next) {
        var now = new Date(),
            dateString = now.getFullYear() + '/' +
                padInt(now.getMonth() + 1) + '/' +
                padInt(now.getDate()) + ' ' +
                padInt(now.getHours()) + ':' +
                padInt(now.getMinutes()) + ':' +
                padInt(now.getSeconds()) + '.' +
                padDecimal(now.getMilliseconds());
        log('\n' + dateString + ' | Request received');
        next();
    });
    // Enable a log of logging.
    app.use(morgan('tiny'))
       // Auto body parsing is nice.
       .use(bodyParser.json())
       // This puts the Github webhook handler into place
       .use(githubHookPath, githubHookHandler.initializer(repoClients, cfg));

    log.debug('The following validators are active:');
    activeValidators = githubHookHandler.getValidators();
    activeValidators.forEach(function(v) {
        log.verbose('\t==> ' + v);
    });

    dynamicHttpHandlerModules = utils.initializeModulesWithin(HANDLER_DIR);

    // Loads all the modules within the handlers directory, and registers the URLs
    // the declared, linked to their request handler functions.
    log.debug('The following URL handlers are active:');
    dynamicHttpHandlerModules.forEach(function(handlerConfig) {
        var urls = Object.keys(handlerConfig);
        urls.forEach(function(url) {
            var handler = handlerConfig[url](repoClients, dynamicHttpHandlerModules, cfg, activeValidators),
                name = handler.title,
                desc = handler.description,
                msg = '\t==> ' + name + ' listening for url pattern: ' + url;
            if (! handler.disabled) {
                log.verbose(msg);
                app.use(url, handler);
            }
        });
    });

    app.listen(PORT, function() {
        log.info('\nServer running at ' + baseUrl + '\n');
    });

});
