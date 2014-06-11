var fs = require('fs'),
    _ = require('underscore'),
    log = require('./log'),
    GH_USERNAME = process.env.GH_USERNAME,
    GH_PASSWORD = process.env.GH_PASSWORD;

function readConfigFileIntoObject(path) {
    if (! fs.existsSync(path)) {
        log.warn('Config file "' + path + '" does not exist!');
        return;
    }
    var raw = fs.readFileSync(path, 'utf-8');
    var obj;
    try {
        obj = JSON.parse(raw);
    } catch(e) {
        throw new Error('Config file "' + path + '" is invalid JSON!');
    }
    return obj;
}

function read(configFile) {
    var username = process.env.USER.toLowerCase(),
        configSplit = configFile.split('.'),
        userFile = configSplit.slice(0, configSplit.length - 1).join('.') + '-' + username + '.json',
        config = readConfigFileIntoObject(configFile),
        userConfig = null;

    userConfig = readConfigFileIntoObject(userFile);
    if (userConfig) {
        ['host', 'port', 'logDirectory', 'validators'].forEach(function(key) {
            if (userConfig[key] !== undefined) {
                config[key] = userConfig[key];
            }
        });
        // Merges monitor configurations (user-specific config overrides default config).
        Object.keys(userConfig.monitors).forEach(function(outerKey) {
            if (! config.monitors[outerKey]) {
                config.monitors[outerKey] = userConfig.monitors[outerKey];
            } else {
                Object.keys(userConfig.monitors[outerKey]).forEach(function(innerKey) {
                    config.monitors[outerKey][innerKey] = userConfig.monitors[outerKey][innerKey];
                });
            }
        });
    }
    // Each monitor also needs a username/password for the Github API, which we're getting from the environment.
    _.each(config.monitors, function(monitorConfig, monitorName) {
        config.monitors[monitorName].username = GH_USERNAME;
        config.monitors[monitorName].password = GH_PASSWORD;
    });

    // Now if there are global validators defined, spread them across all monitor configs.
    if (config.validators) {
        _.each(config.monitors, function(monitorConfig) {
            monitorConfig.validators = config.validators;
        });
    }
    return config;
}

// Fail fast.
if (! GH_USERNAME || ! GH_PASSWORD) {
    throw Error('Both GH_USERNAME and GH_PASSWORD environment variables are required for nupic.tools to run.' +
        '\nThese are necessary for making Github API calls.');
}

module.exports.read = read;