var fs = require('fs'),
    url = require('url'),
    qs = require('querystring'),
    _ = require('underscore'),
    tmpl = require('../utils/template'),
    AnsiConverter = require('ansi-to-html'),
    converter = new AnsiConverter(),
    log = require('../utils/logger').logger,
    style = '<style>'
          + 'body { background: black;'
          + '       color: white;'
          + '       font: 14pt Courier;'
          + '       border-collapse: collapse}'
          + 'table td { border: 1px solid grey; padding: 0 5px; }'
          + '</style>\n',
    title = '<h1>nupic.tools current logs:</h1>\n';

function wrapHtml(content) {
    var htmlOut = '<html><head>' + style + '</head><body>\n' + title;
    htmlOut += '<table><thead><tr><th>Time</th><th>Level</th><th>Message</th></tr></thead><tbody>\n';
    htmlOut += content;
    htmlOut += '</tbody></table>'
    htmlOut += '\n</body></html>';
    return htmlOut;
}

function logLineToHtml(line) {
    return '<tr class="' + line.level + '">'
        +  '<td class="timestamp">' + line.timestamp + '</td>'
        +  '<td class="level">' + line.level + '</td>'
        +  '<td>' + converter.toHtml(line.message) + '</td>'
        +  '</tr>\n';
}

function logViewer(req, res) {
    var linesToRead = 100,
        reqUrl = url.parse(req.url),
        query = qs.parse(reqUrl.query);
    if (query.lines) {
        linesToRead = query.lines;
    }
    log.query({
        limit: linesToRead,
        order: 'asc'
    }, function(err, results) {
        if (err) throw err;
        var htmlOut = tmpl('logs.html', { logs: results.file });
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Length', htmlOut.length);
        res.end(htmlOut);
    });
}

logViewer.title = 'Log Viewer';
logViewer.description = 'Provides an HTML display of the nupic.tools server '
    + 'logs. Defaults to display the most recent log file.';

module.exports = {
    '/logs': function() {
        return logViewer;
    }
};