'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var utils = require('./utils');

var DATA_PATH = path.join(process.cwd(), 'data');

var makeRequest = utils.request;

module.exports = function getElectionIssues() {
  return makeRequest('http://www.ontheissues.org/issues.htm')
    .then(function($) {
      fs.writeFile(
        path.join(DATA_PATH, 'issues.json'),
        $('body > table > tbody > tr > td:first-child > table td a').map(function() {
          return _.trim(this.textContent);
        }).get()
      )
    }
  );
};