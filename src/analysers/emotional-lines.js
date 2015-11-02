'use strict';

var _ = require('lodash');
var sentiment = require('sentiment');
var tokenizers = require('../tokenizers');

var getScore = _.partialRight(_.get, 'score');

module.exports = function emotionalLines(context) {
  return _.sortBy(context.sentences, function(sentence) {
    return Math.abs(sentiment(sentence).score);
  }).reverse().slice(0, 20);
};