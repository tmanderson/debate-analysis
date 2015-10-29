'use strict';

var _ = require('lodash');

module.exports = function() {
  return makeRequest('http://www.ontheissues.org/issues.htm')
    .then(function($) {
      return $('body > table > tbody > tr > td:first-child > table td a').map(function() {
        return _.trim(this.textContent);
      }).get();
    }
  );
};