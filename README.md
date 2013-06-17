nupic-tools
=============

Server for tooling around a development process that ensures the `master` branch is always green, without the needs for a development branch. This is being used to support the development process of the [NuPIC](http://github.com/numenta/nupic) project, but it is ALMOST generalized enough to be used for any project (the `contributor` code is not generic, but can be easily removed).

This server registers a web hook URL with github when it starts up (if it doesn't already exist) and gets notified on pull requests and status changes on the repository specified in the [configuration](#configuration). When pull requests or SHA status updates are received, it runs validators against the SHAs. 

> TODO: Update the documentation for the NuPIC development process that includes the services provided in this server, and update this documentation to link to the new flow.

## Installation

First, install nodejs and npm.

Then, install this npm module and its dependencies:

    npm install .

## Running it

### Configuration

Default configuration settings are in the `config.json` file, but it doesn't have all the information the application needs to run. The github password, for example, has been removed. To provide these instance-level settings, create a new config file using the username of the logged-in user. For example, mine is called `confing-mtaylor.json`. This is where you'll keep your secret configuration settings, like Travis CI token and github password.

### Github API Credentials

The github username and password required in your configuration is used to access the [Github API](http://developer.github.com/). The credentials uses must have push access to the repository declared in the same section.

### Start the server:

    node index.js

## Validators

Validators are modules stored in the `commitValidators` directory, which follow the same export pattern. Each one exports a function called `validate` that will be passed the following arguments:

- `pullRequest`: the pull request object received on the Github webhook
- `statusHistory`: an array of status objects from the [Github Status API](http://developer.github.com/v3/repos/statuses/) for the pull request's `head` SHA
- `githubClient`: an instance of `GithubClient` (see the `githubClient.js` file), which has some convenience methods as well as the underlying `github` object from the [node-github](https://github.com/ajaxorg/node-github) library (TODO: may want to get rid of the GithubClient class and just pass around the raw node-github api object.)
- `callback`: function to call when validation is complete. Expects an error and result object. The result object should contain at the least, a `state` attribute. It can also contain `description` and `target_url`, which will be used to create the new Github status

The current validators are:

- *travis*: Ensures the last travis status was 'success'
- *contributor*: Ensures pull request originator is within a contributor listing
- *fastForward*: Ensures the pull request `head` has the `master` branch merged into it

## Notes

A lot of crap gets dumped to stdout at the moment. 

## Make sure it stays running!

So you really should make sure that your server stays running, so do this:

    sudo npm install forever -g

This will install the [`forever`](https://npmjs.org/package/forever) npm module, which will keep the process running if it fails for some reason. The best way to start it is like this:

    forever start index.js
