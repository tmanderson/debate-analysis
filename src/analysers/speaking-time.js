'use strict';

var _ = require('lodash');
var WPM = 190;

module.exports = function speakingTime(lines) {
  return (
    _.reduce(lines, function(total, line) {
      return total += _.words(line).length;
    }, 0)/WPM
  ).toFixed(2);
};