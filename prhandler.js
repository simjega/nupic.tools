

module.exports = function(githubClient) {
    return function(req, res) {
        console.log('Pull Request Hook recieved!');
        console.log(req.body);
        console.log('deferring action for now...');
        res.end();
    };
};