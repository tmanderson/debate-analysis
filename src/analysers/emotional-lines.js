'use strict';

var _ = require('lodash');
var sentiment = require('sentiment');
var tokenizers = require('../tokenizers');

module.exports = function emotionalLines(lines) {
  return _.map(lines, function(line) {
    return _.sortBy(
      tokenizers.sentence(line),
      function(sentence) {
        return Math.abs(sentiment(sentence).score);  
      }
    ).reverse()[0];
  });
};