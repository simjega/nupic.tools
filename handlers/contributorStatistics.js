var GitHubApi = require("github");
var jsonUtils = require('../utils/json');
var nodeURL = require("url");
var repoClients;



function contributorStatistics (request, response)	{

	var data_out = {},
		responseCount;

	if(nodeURL.parse(request.url).query !== null && nodeURL.parse(request.url, true).query.repo != "all")   {

		if (repoClients[nodeURL.parse(request.url, true).query.repo]) {

			data_out[nodeURL.parse(request.url, true).query.repo] = [];

			repoClients[nodeURL.parse(request.url, true).query.repo].github.repos.getContributors({"user": nodeURL.parse(request.url, true).query.repo.split("/").shift(), "repo": nodeURL.parse(request.url, true).query.repo.split("/").pop(), "anon": false}, function(errors, contribs){
				if (errors == null) {

					contribs.forEach(function(nextContrib){

						(data_out[nodeURL.parse(request.url, true).query.repo]).push({"login": nextContrib.login, "contributions": nextContrib.contributions});
					
					});

					if (nodeURL.parse(request.url, true).query.hasOwnProperty('callback'))	{

						jsonUtils.renderJsonp(data_out, nodeURL.parse(request.url, true).query.callback, response);

					} else {

						jsonUtils.render(data_out, response);

					}

				}
			});

		} else {

			jsonUtils.renderErrors([new Error("Not monitoring this repository!")], response, nodeURL.parse(request.url).query.callback);

		}

	} else {

		responseCount = 0;

		Object.keys(repoClients).forEach(function (nextRepo) {

			data_out[nextRepo] = [];

			repoClients[nextRepo].github.repos.getContributors({"user": repoClients[nextRepo].toString().split("/").shift(), "repo": repoClients[nextRepo].toString().split("/").pop(), "anon": false}, function(errors, contribs){
				if (errors == null) {

					contribs.forEach(function(nextContrib){

						(data_out[nextRepo]).push({"login": nextContrib.login, "contributions": nextContrib.contributions});
					
					});

					responseCount++;

					if (responseCount >= Object.keys(repoClients).length)	{
						
						if (nodeURL.parse(request.url, true).query.hasOwnProperty('callback'))	{

							jsonUtils.renderJsonp(data_out, nodeURL.parse(request.url, true).query.callback, response);

						} else {

							jsonUtils.render(data_out, response);

						}

					}

				} else {

					jsonUtils.renderErrors([new Error(errors)], response, nodeURL.parse(request.url).query.callback);

				}

			});

		});

	}

}


contributorStatistics.name = "Contribution Reporter";
contributorStatistics.description = "Generates JSON/JSONP with all contributors and how many contributions they made for all repos or the repo specified.";

module.exports = {
    '/contribStats': function(_repoClients) {
    	repoClients = _repoClients;
        return contributorStatistics;
    }
};