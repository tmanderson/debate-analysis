'use strict';

var _ = require('lodash');
var sentiment = require('sentiment');

module.exports = function emotionalLines(lines) {
  return _.sortBy(lines, function(line) {
    return Math.abs(sentiment(line).score);
  });
};