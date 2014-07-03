// MAIN PROGRAM, start here.

// global libs
var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    // ExpressJS and associated middleware
    express = require('express'),
    morgan = require('morgan'),
    bodyParser = require('body-parser'),

    logger = require('./utils/logger'),
    logStream,

    // local libs
    utils = require('./utils/general'),
    githubHookHandler = require('./github-hook'),
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

logger = logger.initialize(cfg.logDirectory, cfg.logLevel);
logger.info('nupic.tools server starting...');
logger.info('nupic.tools will use the following configuration:');
logger.debug('nupic.tools configuration', utils.sterilizeConfig(cfg));

// enable web server logging; pipe those log messages through our logger
logStream = {
    write: function(message, encoding){
        logger.info(message);
    }
};

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
        logger.log('\n' + dateString + ' | Request received');
        next();
    });
    // Enable a log of logging.
    app.use(morgan({
        format: 'dev',
        immediate: true,
        stream: logStream
    }))
    // Auto body parsing is nice.
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: true }))
    // This puts the Github webhook handler into place
    app.use(githubHookPath, githubHookHandler.initializer(repoClients, cfg));

    logger.verbose('The following validators are active:');
    activeValidators = githubHookHandler.getValidators();
    activeValidators.forEach(function(v) {
        logger.verbose('\t==> ' + v);
    });

    dynamicHttpHandlerModules = utils.initializeModulesWithin(HANDLER_DIR);

    // Loads all the modules within the handlers directory, and registers the URLs
    // the declared, linked to their request handler functions.
    logger.verbose('The following URL handlers are active:');
    dynamicHttpHandlerModules.forEach(function(handlerConfig) {
        var urls = Object.keys(handlerConfig);
        urls.forEach(function(url) {
            var handler = handlerConfig[url](repoClients, dynamicHttpHandlerModules, cfg, activeValidators),
                name = handler.title,
                msg = '\t==> ' + name + ' listening for url pattern: ' + url;
            if (! handler.disabled) {
                logger.verbose(msg);
                app.use(url, handler);
            }
        });
    });

    app.listen(PORT, function() {
        logger.info('Server running at %s.', baseUrl);
    });

});
