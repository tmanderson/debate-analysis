'use strict';

var _ = require('lodash');

var dictionaries = require('../dictionaries');

module.exports = {
  excludeCommonWords: function(value) {
    return _.filter(value, function(value) {
      return dictionaries.common.indexOf(value.toLowerCase()) < 0;
    });
  }
}