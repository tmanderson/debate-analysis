'use strict';

var _ = require('lodash');
var natural = require('natural');
var dictionaries = require('./dictionaries');
var wordTokenizer = new natural.TreebankWordTokenizer();

_.extend(module.exports, {
  sentence: function sentences(line) {
    var lastSentenceEnd = 0;
    var sentences = [];

    _.each(wordTokenizer.tokenize(line), function(word, i, words) {
      if(/[.!?]/ig.test(word) &&
          i - lastSentenceEnd > 2 &&
            dictionaries.abbreviations.indexOf(word.toLowerCase()) < 0) {

        sentences.push(words.slice(lastSentenceEnd, i + 1).join(' ').replace(/\s([.,'?`"])/g, '$1'));
        lastSentenceEnd = i + 1;
      }
    });
    
    return sentences;
  }
});