// MAIN PROGRAM, start here.

// global libs
var assert = require('assert'),
    fs = require('fs'),
    connect = require('connect'),
    colors = require('colors'),
    // local libs
    utils = require('./utils/general'),
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
    HANDLER_DIR = 'handlers';

console.log('nupic.tools server starting...'.green);
console.log('nupic.tools will use the following configuration:');
console.log(JSON.stringify(utils.sterilizeConfig(cfg), null, 2).yellow);

utils.constructRepoClients(prWebhookUrl, cfg, function(repoClients) {
    var dynamicHttpHandlerModules,
        activeValidators,
        // The Connect JS application
        app = connect(),
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
        console.log('\n' + dateString + ' | Request received');
        next();
    });
    // Enable a log of logging.
    app.use(connect.logger('dev'))
       // Auto body parsing is nice.
       .use(connect.bodyParser())
       // This puts the Github webhook handler into place
       .use(githubHookPath, githubHookHandler.initializer(repoClients, cfg));

    console.log('The following validators are active:'.cyan);
    activeValidators = githubHookHandler.getValidators();
    activeValidators.forEach(function(v) {
        console.log(('\t==> ' + v).cyan);
    });

    dynamicHttpHandlerModules = utils.initializeModulesWithin(HANDLER_DIR);

    // Loads all the modules within the handlers directory, and registers the URLs
    // the declared, linked to their request handler functions.
    console.log('The following URL handlers are active:'.cyan);
    dynamicHttpHandlerModules.forEach(function(handlerConfig) {
        var urls = Object.keys(handlerConfig);
        urls.forEach(function(url) {
            var handler = handlerConfig[url](repoClients, dynamicHttpHandlerModules, cfg, activeValidators),
                name = handler.title,
                desc = handler.description,
                msg = '\t==> ' + name + ' listening for url pattern: ' + url;
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
