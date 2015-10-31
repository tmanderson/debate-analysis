'use strict';

var _ = require('lodash');

var applauseRE = /\[applause\]/ig;
var laughterRE = /\[laughter\]/ig;

module.exports = function audienceReception(lines) {
  return _.reduce(lines, function(reactions, line) {
    reactions.applause.push.call(reactions.applause, (line.match(applauseRE) && line || null));
    reactions.laughter.push.call(reactions.laughter, (line.match(laughterRE) && line || null));
    return _.mapValues(reactions, function(v) { return _.filter(v, _.identity); });
  }, { applause: [], laughter: [] });
};