'use strict';

var _ = require('lodash');

_.extend(global, {
  WPM: 190,
  REPORTS_PATH: './reports',
  CANDIDATES_PATH: './data/candidates',
  TRANSCRIPT_PATH: './data/transcripts'
});

var fs = require('fs');
var path = require('path');
var args = process.argv.slice(2);

var natural = require('natural');
var TfIdf = natural.TfIdf;

natural.PorterStemmer.attach();

var Debate = require('./src/debate');
var commonWords = require('./src/dictionaries').common;

var debates = Debate.getAllForParty('republican');

_.each(debates, function(debate) {
  var tfidf, docs;
  var data = [];

  debate.forEachSpeaker(function(speaker) {
    if(!speaker) return;

    var usedWords = {};
    var uniqueWords = [];
    var totalWords = 0;

    _.each(speaker.lines, function(line) {
      _.each(_.words(line), function(word) {
        word = word.toLowerCase();
        totalWords++;

        if(commonWords.indexOf(word) > -1 || word.length < 2) return;

        if(!usedWords[word]) {
          uniqueWords.push(word);
          usedWords[word] = 0;
        }

        usedWords[word]++;
      });
    });

    tfidf = new TfIdf();
    _.each(speaker.lines, tfidf.addDocument, tfidf);
    
    data.push({
      name: speaker.name,

      totalWords: totalWords,
      speakingTime: Math.round(totalWords/WPM),

      averageWordUsage: _.pick(
        _.mapValues(usedWords, function(count) {
          return count / uniqueWords.length;
        }),
        function(val, key) {
          return (uniqueWords.indexOf(key) > -1) && val > 0.009 && key;
        }
      ),

      importantWords: _.zipObject(
        _.filter(
          tfidf.listTerms(0).map(function(item, i) {
            return [ item.term, item.tfidf ];
          }),
          function(line) {
            return !_.includes(commonWords, line[0]);
          }
        ).slice(0, 20) // Most unique words via tfidf
      ),

      issueRelevance: _.zipObject(
        _.sortBy(
          _.map(speaker.issues, function(issue) {
            docs = tfidf.tfidfs(issue);
            return [ issue, _.reduce(docs, _.add, 0) / 100 ];
          }),
          function(val) {
            return val[1];
          }
        ).reverse() // issue relevance to most important terms (via website issue -> tfidf)
      )
    });
  });

  fs.writeFileSync(path.join(REPORTS_PATH, _.kebabCase(debate.name) + '.json'), JSON.stringify(data, null, 2));
});
