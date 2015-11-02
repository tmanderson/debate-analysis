'use strict';

var _ = require('lodash');

module.exports = function totalWords(context) {
  return _.reduce(context.lines, function(count, line) {
    return count + line.split('').length;
  }, 0);
};