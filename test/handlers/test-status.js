var assert = require('assert'),
    urlMap = require('../../handlers/status');

describe('status reporter url mapping', function() {
    it('has an entry for the /status URL', function() {
        assert(Object.keys(urlMap).indexOf('/status') > -1, 
            'handler does not have proper url mapping');
    });
});

describe('/status URL handler', function() {
    var initializer = urlMap['/status'];

    it('is a function with title and description', function() {
        var handler = initializer();
        assert.equal(typeof handler, 'function', 'handler initializer does not return function');
        assert.equal('Status Reporter', handler.title, 'bad handler title');
        assert(typeof handler.description, 'string', 'bad handler description string');
    });

});


describe('status reporter', function() {
    it('creates proper status report html', function() {
        var expectedHtml = "<html><body>\n" +
            "<h1>nupic.tools is alive</h1>\n" +
            "<h3>This server is monitoring the following repositories:</h3><ul>\n" +
            "<li><a target=\"_blank\" href=\"http://github.com/clientA/\">http://github.com/clientA</a></li>" +
            "<li><a target=\"_blank\" href=\"http://github.com/clientB/\">http://github.com/clientB</a></li>\n" +
            "</ul>\n" +
            "<h3>The following validators are active:</h3><ul>\n" +
            "<li>validatorA</li><li>validatorB</li>\n" +
            "</ul>\n" +
            "<h3>Available add-on services:</h3><ul>\n" +
            "<li><a target=\"_blank\" href=\"/handlerA\">handlerA</a>: handlerA-description</li>" +
            "<li><a target=\"_blank\" href=\"/handlerB\">handlerB</a>: handlerB-description</li>\n" +
            "</ul>\n" +
            "</body></html>";
        var mockRepoClients = {'clientA': 0, 'clientB': 1},
            handlerA = function() {}, 
            handlerB = function() {}
            mockHttpHandlers = [{
                "/handlerA": function() { return handlerA; }
            }, {
                "/handlerB": function() { return handlerB; }
            }],
            mockConfig = {},
            mockValidators = ['validatorA', 'validatorB'],
            endCalled = false;
        handlerA.title = 'handlerA';
        handlerA.description = 'handlerA-description';
        handlerB.title = 'handlerB';
        handlerB.description = 'handlerB-description';
        var requestHandler = urlMap['/status'](
            mockRepoClients, mockHttpHandlers, mockConfig, mockValidators
        );
        var mockResponse = {
            setHeader: function() {},
            end: function(htmlOut) {
                endCalled = true;
                assert.equal(expectedHtml, htmlOut);
            }
        };
        requestHandler(null, mockResponse);
        assert(endCalled, 'response was not closed');
    });
});

