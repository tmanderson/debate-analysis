'use strict';

var _ = require('lodash');

module.exports = function usedWords(context) {
  _.set(context, 'wordFrequencies',
    _.reduce(context.lines, function(words, line) {
      _.each(_.words(line), function(word) {
        word = word.toLowerCase();

        if(!words[word]) words[word] = 0;

        words[word]++;
      });

      return words;
    }, {})
  );
};