var request = require('request'),
    url = require('url'),
    csvUrl = 'http://numenta.org/resources/contributors.csv';

function errorToHtml(error) {
    return '<div style="margin:10px;padding:10px;font-size:20pt;color:red">' + error + '</div>';
}

function csvToHtml(csv) {
    var out = '', count = 0;
    csv.split('\n').forEach(function(line) {
        var cell = 'td';
        if (count++ == 0) {
            cell = 'th';
        }
        out += '<tr>' + line.split(',').reduce(function(prev, curr) {
            return prev + '<' + cell + '>' + curr + '</' + cell + '>';
        }, '') + '</tr>\n';
    });
    return '<table>' + out + '</table>';
}

function csvToJson(csv) {
    var contributors = [],
        lines = csv.split('\n'),
        header = lines.shift().split(',');
    lines.forEach(function(line) {
        var obj = {},
            person = line.split(',');
        header.forEach(function(key, i) {
            obj[key] = person[i];
        });
        contributors.push(obj);
    });
    return JSON.stringify({contributors: contributors});
}

function renderHtml(out, res) {
    res.setHeader('Content-Type', 'text/html');
    res.write('<html><body>' + csvToHtml(out) + '</body></html>');
}

function renderJson(out, res) {
    res.setHeader('Content-Type', 'application/json');
    res.write(csvToJson(out));
}

function renderError(err, res) {
    res.setHeader('Content-Type', 'text/html');
    res.write('<html><body>' + errorToHtml(err) + '</body></html>');
}

function handler(req, res) {
    var reqUrl = url.parse(req.url);
    console.log(reqUrl);
    request(csvUrl, function(err, csvResponse, body) {
        var out = '';
        if (err) {
            renderError(err, res);
        } else if (reqUrl.path == '/.html') {
            renderHtml(body, res);
        } else if (reqUrl.path == '/.json') {
            renderJson(body, res);
        } else {
            renderError(new Error('unrecognized data type ' + reqUrl.path), res);
        }
        res.end();
    });
}

module.exports = function() {
    return handler;
};