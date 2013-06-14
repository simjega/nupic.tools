var fs = require('fs'),
    logDir, channel;

function requestHandler(req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.end('<html><body>logs here</body></html>');

    

}


module.exports = function(logDirectory, channelName) {
    logDir = logDirectory;
    channel = channelName;
    return requestHandler;
};