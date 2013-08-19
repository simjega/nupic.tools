var fs = require('fs'),
    exec = require('child_process').exec,
    request = require('request'),

    S3_URL = 'https://s3-us-west-2.amazonaws.com/',
    S3_BUCKET = 'artifacts.numenta.org',
    COVERAGE_DIR = 'artifacts/coverage',
    SUMMARY_PATH = 'coverage/summary.txt',
    MASTER = 'master',
    COMPARATOR = 'Statements';

require('colors');

function getCurrentGitBranch(callback) {
    exec('git branch -v', function(err, stdout) {
        var branches, activeBranch, activeBranchName;
        branches = stdout.trim().split('\n').map(function(line) {
            var active = line.indexOf('*') == 0,
                parts, branchName, sha, message, detached;
            line = line.substr(2).trim();
            parts = line.split(/\s+/);
            if (parts[0] == '(detached') {
                detached = true;
                branchName = parts.slice(0, 3).join(' ');
                sha = parts[3];
                message = parts.slice(4, parts.length - 1).join(' ');
            } else {
                branchName = parts[0];
                sha = parts[1];
                message = parts.slice(2, parts.length - 1).join(' ');
            }
            return {
                active: active,
                name: branchName,
                sha: sha,
                message: message,
                detached: detached
            };
        });
        activeBranch = branches.filter(function(branch) {
            return branch.active;
        }).pop();
        if (activeBranch.detached) {
            activeBranchName = activeBranch.name.split(' ').pop();
            activeBranchName = activeBranchName.substr(0, activeBranchName.length - 1);
        } else {
            activeBranchName = activeBranch.name;
        }
        callback(activeBranchName);
    });
}

function getRepoSlug(callback) {
    callback('numenta/nupic.tools');
}

function getCoverageMap(summaryText) {
    var dataOut = {};
    summaryText.split('\n').filter(function(line) {
        return line.indexOf(':') > -1;
    }).forEach(function(dataLine) {
        var parts = dataLine.split(':').map(function(field) {
            return field.trim();
        });
        dataOut[parts.shift()] = parseFloat(parts.shift().split('%').shift());
    });
    return dataOut;
}

function compareLocalReportWithRemote(localReport, repoSlug, branch) {
    var remoteSummaryUrl = S3_URL + S3_BUCKET + '/artifacts/' 
                           + repoSlug + '/' + branch + '/coverage/summary.txt';
    console.info('Fetching last coverage report from \n' + remoteSummaryUrl);
    request.get(remoteSummaryUrl, function(err, resp, body) {
        var remoteReport;
        if (resp.statusCode !== 200) {
            // There is no existing report for this branch.
            console.log(('No existing coverage report for this branch (' + branch + ').').yellow);
            // If this is the master branch, this must be the first time this 
            // process has run against master, so just pass it.
            if (branch == MASTER) {
                console.log('Coverage validation passed.'.green);
            } else {
                console.log('Re-running against remote coverage summary from "master" branch.');
                compareLocalReportWithRemote(localReport, repoSlug, MASTER);
            }
        } else {
            remoteReport = getCoverageMap(body);
            if (localReport[COMPARATOR] < remoteReport[COMPARATOR]) {
                console.error(
                    '\nCOVERAGE VALIDATION FAILED!\n'.red.bold +
                    'Last coverage value of ' + COMPARATOR + ': ' + (remoteReport[COMPARATOR] + '%\n').green +
                    'This coverage value of ' + COMPARATOR + ': ' + (localReport[COMPARATOR] + '%\n').yellow +
                    'See last coverage summary at ' + remoteSummaryUrl.magenta + '.\n'
                );
                process.exit(-1);
            } else {
                console.log('Coverage validation passed.'.green);
            }
        }
    });
}

(function() {
    console.log('\nComparing local code coverage to last known coverage...');
    var localSummaryText = fs.readFileSync(SUMMARY_PATH, 'utf-8');
    var localReport = getCoverageMap(localSummaryText);

    getCurrentGitBranch(function(branch) {
        console.info('Running on branch "' + branch + '"');
        getRepoSlug(function(slug) {
            compareLocalReportWithRemote(localReport, slug, branch);
        });
    });
}());
