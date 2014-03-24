var fs = require('fs'),
    AnsiConverter = require('ansi-to-html'),
    converter = new AnsiConverter(),
    logDirectory,
    style = '<style>'
          + 'body { background: black;'
          + '       color: white;'
          + '       font: 14pt Courier;}'
          + '.ln { float: left; width: 100px; }'
          + '.ln a,.ln a:visited,.ln a:hover {'
          + '    color: grey; text-decoration: none'
          + '}'
          + '.ln a:hover { text-decoration: underline }'
          + '</style>\n',
    title = '<h1>nupic.tools current logs:</h1>\n';

function getLatestModifiedFileIn(dir, filePaths, callback) {
    var latest = null,
        count = 0;
    filePaths.forEach(function(path) {
        if (path.split('.').pop() == 'log') {
            fs.stat(dir + '/' + path, function(err, stats) {
                if (err) throw err;
                if (! latest) {
                    latest = { path: path, mtime: stats.mtime};
                } else {
                    if (stats.mtime > latest.mtime) {
                        latest = { path: path, mtime: stats.mtime};
                    }
                }
                if (++count == (filePaths.length - 1)) {
                    callback(null, latest.path);
                }
            });
        } else {
            if (++count == (filePaths.length - 1)) {
                callback(null, latest.path);
            }
        }
    });
}

function ansiToHtml(ansiOut) {
    var htmlOut = '<html><head>' + style + '</head><body>\n' + title,
        lineCount = 0,
        ansiHtml = converter.toHtml(ansiOut);
    ansiHtml = ansiHtml.replace(/  /g, '&nbsp;&nbsp;');
    // ansiHtml = ansiHtml.replace(/\n/g, '\n</br>');
    ansiHtml = ansiHtml.replace(/\n/g, function() {
        var hash = 'L' + (++lineCount),
            anchor = '<a href="#' + hash + '">' + lineCount + '</a>',
            target = '<div class="ln" id="' + hash + '">' + anchor + '</div>';
        return '\n<br/>' + target;
    });
    htmlOut += ansiHtml;
    htmlOut += '\n</body></html>';
    return htmlOut;
}

function logViewer(req, res) {
    fs.readdir(logDirectory, function(err, files) {
        if (err) {
            return res.end(err.toString());
        };
        getLatestModifiedFileIn(logDirectory, files, 
            function(err, latestLogFilePath) {
                if (err) throw err;
                fs.readFile(logDirectory + '/' + latestLogFilePath, 'utf-8', 
                    function(err, ansiOut) {
                        if (err) throw err;
                        var htmlOut = ansiToHtml(ansiOut);
                        res.setHeader('Content-Type', 'text/html');
                        res.setHeader('Content-Length', htmlOut.length);
                        res.end(htmlOut);
                    }
                );
            }
        );
    });

}

logViewer.title = 'Log Viewer';
logViewer.description = 'Provides an HTML display of the nupic.tools server '
    + 'logs. Defaults to display the most recent log file.';

module.exports = {
    '/logs': function(_, _, config) {
        logDirectory = config.logDirectory;
        // TODO: validate log directory here
        return logViewer;
    }
};