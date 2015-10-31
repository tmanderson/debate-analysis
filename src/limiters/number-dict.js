'use strict';

var _ = require('lodash');

module.exports = function numberDictionaryLimiter(value, limit) {
  return _.reduce(
    _.sortBy(
      _.pairs(value),
      function(val) {
        return val[1];
      }
    ).reverse().slice(0, limit),
    function(output, value) {
      return _.set(output, value[0], value[1])
    },
    {}
  );
}