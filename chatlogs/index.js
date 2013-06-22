var fs = require('fs'),
    url = require('url'),
    logDir, channel;

function listLogs(dir, ch, callback) {
    fs.readdir(dir, function(err, files) {
        if (err) throw err;
        callback(null, files.filter(function(file) {
            return file.indexOf(ch + '.') == 0
        }));
    });
}

function logToHtml(log) {
    return log.trim()
              .replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .split('\n')
              .join('</li><li>');
}

function renderLogFile(name, res) {
    var file = logDir + '/' + name;
    console.log('Reading log file ' + file);
    fs.readFile(file, 'utf-8', function(err, log) {
        if (err) throw err;
        var out = '<html><body><h1>' + channel + ' logs</h1><ul>';
        out += '<li>' + logToHtml(log) + '</li>';
        out += '</ul></body></html>';
        res.end(out);
    });
}

function requestHandler(req, res) {
    var urlParts = url.parse(req.url);
    var logDate = urlParts.pathname.substr(1);
    res.setHeader('Content-Type', 'text/html');
    if (logDate) {
        renderLogFile(channel + '.log.' + logDate, res);
    } else {
        listLogs(logDir, channel, function(err, logs) {
            if (err) throw err;
            var out = '<html><body><h1>' + channel + ' logs</h1><ul>';
            logs.forEach(function(logName) {
                var dateString = logName.split('.').pop();
                out += '<li><a href="/chatlogs/' + dateString + '">' + dateString + '</a></li>';
            });
            out += '</ul></body></html>';
            res.end(out);
        });
    }
}


module.exports = function(logDirectory, channelName) {
    logDir = logDirectory;
    channel = channelName;
    return requestHandler;
};