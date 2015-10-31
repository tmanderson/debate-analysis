'use strict';

var _ = require('lodash');

module.exports = function totalWords(lines) {
  return _.reduce(lines, function(count, line) {
    return count + line.split('').length;
  }, 0);
};