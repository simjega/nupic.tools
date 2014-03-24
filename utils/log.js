var colors = require('colors'),
    loggerTheme = {
        silly: 'rainbow',
        input: 'grey',
        log: 'grey',
        verbose: 'cyan',
        prompt: 'grey',
        info: 'green',
        data: 'grey',
        help: 'cyan',
        warn: 'yellow',
        debug: 'blue',
        error: 'red'
    };

colors.setTheme(loggerTheme);

function log(message, level) {
    if (level == undefined) {
        level = 'log';
    }
    console.log(message[level]);
};

Object.keys(loggerTheme).forEach(function(name) {
    log[name] = function(m) {
        log(m, name);
    };
});

/**
 * Exposes simple colored logging functions. 
 *     var l = require('./utils/log');
 *     l('prints at "log" level');
 *     l.debug('debug level');
 *     l.info('info level');
 * Etc. 
 */
module.exports = log;