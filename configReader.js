var fs = require('fs'),
    configFile = './config.json',
    username = process.env.USER.toLowerCase(),
    userFile = './config-' + username + '.json';

function readConfigFileIntoObject(path) {
    if (! fs.existsSync(path)) {
        console.warn('Config file "' + path + '" does not exist!');
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

function read() {
    var config = readConfigFileIntoObject(configFile),
        userConfig = null;
    userConfig = readConfigFileIntoObject(userFile);
    if (userConfig) {
        ['host', 'port'].forEach(function(key) {
            if (userConfig[key] !== undefined) {
                config[key] = userConfig[key];
            }
        });
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
    return config;
}

module.exports.read = read;