'use strict';

var _ = require('lodash');

var dictionaries = require('../dictionaries');

module.exports = function averageWordUsage() {
  return _.pick(
    _.mapValues(this.usedWords, function(count) {
      return (count / this.uniqueWords.length).toFixed(4);
    }, this),
    function(val, key) {
      return dictionaries.common.indexOf(key) < 0 &&
        this.uniqueWords.indexOf(key) > -1 &&
        key.length > 2 &&
        val > 0.009 &&
        key;
    },
    this
  );
}