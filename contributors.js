var request = require('request'),
    url = require('url'),
    qs = require('querystring'),
    $ = require('jquery'),
    csvUrl = 'http://numenta.org/resources/contributors.csv',
    listSubscriberUrl = 'http://lists.numenta.org/mailman/roster/nupic_lists.numenta.org';

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
            if (person[i] == '0' || person[i] == '1') {
                obj[key] = parseInt(person[i]);
            } else {
                obj[key] = person[i];
            }
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

function renderJsonP(out, cbName, res) {
    res.setHeader('Content-Type', 'application/javascript');
    res.write(cbName + '(' + csvToJson(out) + ')');
}

function renderError(err, res) {
    res.setHeader('Content-Type', 'text/html');
    res.end('<html><body>' + errorToHtml(err) + '</body></html>');
}

function getMailingListRoster(callback) {
    request(listSubscriberUrl, function(err, _, body) {
        var mailingListRoster = [];
        if (err) {
            return callback(err);
        }
        $(body).find('li a').each(function(i, item) {
            mailingListRoster.push(item.innerHTML.replace(' at ', '@'));
        });
        callback(err, mailingListRoster);
    });
}

function updateWithMailingListDetails(csv, roster) {
    var lines = csv.trim().split('\n'),
        header = lines.shift();
    header += ',Subscriber';
    lines.forEach(function(line, i) {
        var found = false;
        roster.forEach(function(email) {
            if (found) return;
            if (line.indexOf(email) > -1) {
                found = true;
            }
        });
        lines[i] = line + (found ? ',1' : ',0');
    });
    return header + '\n' 
         + lines.join('\n');
}

function handler(req, res) {
    var reqUrl = url.parse(req.url),
        query = qs.parse(reqUrl.query);

    getMailingListRoster(function(err, roster) {
        if (err) {
            return renderError(err, res);
        }
        request(csvUrl, function(err, _, body) {
            var out = '';
            if (err) {
                return renderError(err, res);
            }
            var csv = updateWithMailingListDetails(body, roster);
            if (reqUrl.pathname == '/.html') {
                renderHtml(csv, res);
            } else if (reqUrl.pathname == '/.json') {
                if (query.callback) {
                    renderJsonP(csv, query.callback, res);
                } else {
                    renderJson(csv, res);
                }
            } else {
                renderError(new Error('unrecognized data type ' + reqUrl.pathname), res);
            }
            res.end();
        });
    });
}

module.exports = function() {
    return handler;
};