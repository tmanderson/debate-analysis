'use strict';

var _ = require('lodash');

var dictionaries = require('../dictionaries');

module.exports = function uniqueWords(lines) {
  return _.sortBy(
    _.reduce(lines, function(uniques, line) {
      return uniques.concat(
        _.filter(_.words(line), function(word) {
          return (uniques.indexOf(word) < 0);
        })
      );
    }, []),
    function(word) {
      return this.usedWords[word];
    },
    this
  );
};