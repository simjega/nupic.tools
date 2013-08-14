var fs = require('fs');

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

module.exports = {
    initializeModulesWithin: initializeModulesWithin
};