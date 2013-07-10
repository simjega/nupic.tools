var fs = require('fs'),
    configFile = './config.json',
    username = process.env.USER.toLowerCase(),
    userFile = './config-' + username + '.json';

function readConfigFileIntoObject(path) {
    if (! fs.existsSync(path)) {
        throw new Error('Config file "' + path + '" does not exist!');
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
    var defaultConfig = readConfigFileIntoObject(configFile),
        userConfig = {};
    try {
        userConfig = readConfigFileIntoObject(userFile);
    } catch(e) {
        // no user file, no problem
    }
    ['host', 'port'].forEach(function(key) {
        if (userConfig[key] !== undefined) {
            defaultConfig[key] = userConfig[key];
        }
    });
    defaultConfig.monitor = defaultConfig.monitor.concat(userConfig.monitor);
    return defaultConfig;
}

module.exports.read = read;