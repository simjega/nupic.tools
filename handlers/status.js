var url = require('url'),
    json = require('../utils/json'),
    template = require('../utils/template'),
    repoClients,
    httpHandlers,
    config,
    validators;

function generateOutputData() {
    var handlers = httpHandlers.map(function(handlerConfig) {
        var urls = Object.keys(handlerConfig),
            output = {};
        urls.forEach(function(url) {
            var handler = handlerConfig[url](repoClients, httpHandlers, config, validators);
            output[url] = {
                url: handler.url,
                title: handler.title,
                description: handler.description,
                disabled: handler.disabled
            };
        });
        return output;
    });
    return {
        monitors: Object.keys(repoClients),
        validators: validators,
        handlers: handlers
    };
}

function statusReporter(req, res) {
    var htmlOut,
        jsonOut = generateOutputData();
    if (url.parse(req.url, false, true).pathname.split(".").pop() == "json") {
        if(url.parse(req.url).query !== null)   {
            json.renderJsonp(jsonOut, url.parse(req.url, true).query.callback, res);
        }   else    {
            json.render(jsonOut, res);
        }
    } else {
        htmlOut = template('status.html', jsonOut);
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Length', htmlOut.length);
        res.end(htmlOut);
    }
}

function handler(_repoClients, _httpHandlers, _config, activeValidators) {
    repoClients = _repoClients;
    httpHandlers = _httpHandlers;
    config = _config;
    validators = activeValidators;
    return statusReporter;
}

statusReporter.title = 'Status Reporter';
statusReporter.description = 'Reports the repositories this tools server is monitoring.';
statusReporter.url = '/status';

module.exports = {
    '/status*': handler
};
