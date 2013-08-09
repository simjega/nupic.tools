var fs = require('fs');

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