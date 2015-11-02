'use strict';

var _ = require('lodash');

var dictionaries = require('../dictionaries');

module.exports = function uniqueWords(context) {
  _.set(context, 'uniqueWords',
    _.sortBy(
      _.keys(context.wordFrequencies),
      function(word) {
        return /\d/.test(word) || word.length < 3 ? 20 : context.wordFrequencies[word];
      }
    )
  );


  return {
    leastUsed: context.uniqueWords.slice(0, 20),
    totalUniqueWords: context.uniqueWords.length
  };
};