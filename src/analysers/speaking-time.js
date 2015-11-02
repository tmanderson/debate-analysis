'use strict';

var _ = require('lodash');
var WPM = 190;

module.exports = function speakingTime(context) {
  var time = (
    _.reduce(context.lines, function(total, line) {
      return total += _.words(line).length;
    }, 0)/WPM
  ).toFixed(2);

  context.debate.estimatedLength += time;
  return time;
};