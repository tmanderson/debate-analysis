'use strict';

var _ = require('lodash');

var tokenizers = require('../tokenizers');

var applauseRE = /\[applause\]/ig;
var laughterRE = /\[laughter\]/ig;

module.exports = function audienceReception(lines) {
  return _.reduce(lines, function(reactions, line) {
    _.each(tokenizers.sentence(line), function(sentence) {
      reactions.applause.push.call(reactions.applause, (sentence.match(applauseRE) && sentence || null));
      reactions.laughter.push.call(reactions.laughter, (sentence.match(laughterRE) && sentence || null));  
    });
    
    return _.mapValues(reactions, function(v) { return _.filter(v, _.identity); });
  }, { applause: [], laughter: [] });
};