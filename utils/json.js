function renderJson(output, res) {
    var out = output;
    if (typeof output == 'object') {
        out = JSON.stringify(output);
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Length', out.length);
    res.end(out);
}

function renderJsonp(output, cbName, res) {
    var out = output,
        textOut;
    if (typeof output == 'object') {
        out = JSON.stringify(output);
    }
    textOut = cbName + '(' + out + ')';
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Content-Length', textOut.length);
    res.end(textOut);
}

function renderErrors(errs, res) {
    var out = JSON.stringify({errors: errs.map(function(e) { return e.message; })});
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Length', out.length);
    res.end(out);
}

module.exports = {
    renderJson: renderJson,
    renderJsonp: renderJsonp,
    renderErrors: renderErrors
};