var path = require('path'),
    fs = require('fs'),
    logger = require('./logger').logger,
    Handlebars = require('Handlebars'),
    TEMPLATE_DIR = '../templates',
    templateDir = path.join(__dirname, TEMPLATE_DIR),
    templateFiles,
    templates = {};

// On module load, read the template files, compile them, and cache them for
// runtime usage.
logger.debug('Compiling templates in %s', templateDir);
templateFiles = fs.readdirSync(templateDir);
templateFiles.forEach(function(file) {
    var filePath = path.join(templateDir, file),
        source = fs.readFileSync(filePath, 'utf-8');
    logger.debug('Template: %s', filePath);
    templates[file] = {
        raw: source,
        compiled: Handlebars.compile(source)
    };
    logger.debug('Compiled template for %s', file);
});

module.exports = function(name, data) {
    logger.debug('Searching for template "%s"...', name);
    logger.debug(data);
    return templates[name].compiled(data);
};