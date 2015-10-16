'use strict';

var _ = require('lodash');
var natural = require('natural');
var TfIdf = natural.TfIdf;

module.exports = {
  tfidf: function(lines, count) {
    var tfidf = new TfIdf();

    _.each(lines, function(line) {
      tfidf.addDocument(line.replace(/[-'"]/g, ''));
    });

    var top;

    return tfidf.listTerms(0).map(function(item) {
      if(!top) top = item.tfidf;
      return item.term + ': ' + (item.tfidf/top);
    }).slice(0, count || 20);
  },

  /**
   * Determines the total words, total unique words, and word diversity (unique/total)
   * of a given set of lines.
   * 
   * @param  {Array[String]} lines - The lines to analyze
   * @return {Object}              - An object with `total`, `unique` and
   *                                 `word_diversity` properties
   */
  counts: function(lines) {
    var tokenizer = new natural.WordTokenizer();

    var words = {};
    var total = 0;
    var unique = 0;

    _.each(lines, function(line) {
      _.each(tokenizer.tokenize(line), function(word, i) {
        if(!words[word]) {
          unique++;
          words[word] = 1;
        }
        
        words[word]++;
        total++;
      });
    });

    var least = _.sortBy(_.uniq(_.values(words)));
    var most = _.clone(least).reverse().slice(0,10);
    
    least = least.slice(0,10);
    
    return {
      total: total,
      unique: unique,
      word_diversity: unique/total,
      least_used: _.filter(_.keys(words), function(word) {
        for(var i in least) if(words[word] <= least[i]) return word;
      }).slice(0,10),
      most_used: _.filter(_.keys(words), function(word) {
        for(var i in most) if(words[word] >= most[i]) return word;
      }).slice(0,10)
    };
  }
};