'use strict';

var _ = require('lodash');

module.exports = function usedWords(lines) {
  this.include = false;
  
  return _.reduce(lines, function(words, line) {
    _.each(_.words(line), function(word) {
      if(!words[word]) words[word] = 0;
      words[word]++;
    });

    return words;
  }, {});
};