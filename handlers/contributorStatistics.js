var jsonUtils = require('../utils/json');
var nodeURL = require("url");
var repoClients;



function contributorStatistics (request, response)    {

    var dataOut = {},
        responseCount,
        urlQuery = nodeURL.parse(request.url, true).query;

    if(nodeURL.parse(request.url).query !== null && urlQuery.repo != "all")   {

        if (repoClients[urlQuery.repo]) {

            dataOut[urlQuery.repo] = [];

            repoClients[urlQuery.repo].github.repos.getContributors({
                "user": urlQuery.repo.split("/").shift(),
                "repo": urlQuery.repo.split("/").pop(),
                "anon": false
            }, function(errors, contribs){
                if (errors == null) {

                    dataOut[urlQuery.repo] = contribs.map(function(nextContrib){

                        return {
                            "login": nextContrib.login, 
                            "contributions": nextContrib.contributions
                        };

                    });

                    jsonUtils.render(dataOut, response, urlQuery.callback);

                }
            });

        } else {

            jsonUtils.renderErrors(
                [new Error("Not monitoring this repository!")], 
                response, urlQuery.callback
            );

        }

    } else {

        responseCount = 0;

        Object.keys(repoClients).forEach(function (nextRepo) {

            dataOut[nextRepo] = [];

            repoClients[nextRepo].github.repos.getContributors({
                "user": repoClients[nextRepo].toString().split("/").shift(),
                "repo": repoClients[nextRepo].toString().split("/").pop(),
                "anon": false
            }, function(errors, contribs){

                if (errors == null) {

                    dataOut[nextRepo] = contribs.map(function(nextContrib){

                        return {
                            "login": nextContrib.login, 
                            "contributions": nextContrib.contributions
                        };

                    });

                    responseCount++;

                    if (responseCount >= Object.keys(repoClients).length)    {

                        jsonUtils.render(dataOut, response, urlQuery.callback);

                    }

                } else {

                    jsonUtils.renderErrors(
                        [new Error(errors)], response, urlQuery.callback
                    );

                }

            });

        });

    }

}


contributorStatistics.name = "Contribution Reporter";
contributorStatistics.description = "Generates JSON/JSONP with all contributors "
    + "and how many contributions they made for all repositorys or the "
    + "repository specified in a 'repo' parameter. For JSONP add a 'callback' "
    + "parameter.";

module.exports = {
    '/contribStats': function(_repoClients) {
        repoClients = _repoClients;
        return contributorStatistics;
    }
};