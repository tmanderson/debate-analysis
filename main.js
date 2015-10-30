'use strict';

var _ = require('lodash');

/**
 * This is a discreet way of saying "don't use this with other code"
 * If somehow this ever gets into some application, this can change.
 */
_.extend(global, {
  WPM: 190,
  REPORTS_PATH: './reports',
  CANDIDATES_PATH: './data',
  TRANSCRIPT_PATH: './data/transcripts',
  DEBATE_PARTIES: ['democratic', 'republican']
});

var fs = require('fs');
var path = require('path');
var args = process.argv.slice(2);

var natural = require('natural');
var TfIdf = natural.TfIdf;
var sentiment = require('sentiment');
var sentenceTokenizer = require('./src/tokenizers').sentence;

natural.PorterStemmer.attach();

var Debate = require('./src/debate');
var dictionaries = require('./src/dictionaries');
var commonWords = dictionaries.common;
var candidates = dictionaries.candidates;

var debates = [].concat(Debate.getAllForParty('democratic')).concat(Debate.getAllForParty('republican'));

function getNormalizedCandidateName(value) {
  return _.find(candidates, function(name) {
    name = name.split(' ');
    return (name[0] === value.toLowerCase() || name[1] === value.toLowerCase());
  });
}

_.each(debates, function(debate) {
  var tfidf, docs;
  
  var collectiveTotalWords = 0;
  var collectiveUsedWords = {};
  var collectiveUniqueWords = [];
  var totalEstimatedTime = 0;

  var data = [];

  debate.forEachSpeaker(function(speaker) {
    if(!speaker) return;

    var totalWords = 0;   // total words spoken
    var usedWords = {};   // [word] -> (# of times used)
    var uniqueWords = []; // contains first occurance of word
    var callouts = {};    // other candidates called out by this speaker
    var mostSentimentalLines = {};

    _.each(speaker.lines, function(line) {
      // get each sentence
      _.each(sentenceTokenizer(line), function(sentence) {
        var sentimentality = sentiment(sentence);
        var lastName, name;

        // process each word within the sentence
        _.each(_.words(sentence), function(word, i, words) {
          name = getNormalizedCandidateName(word);

          word = word.toLowerCase();
          totalWords++;
          
          if(name && name !== lastName) {
            if(!callouts[name]) {
              callouts[name] = { total: 0, sentiment: 0, lines: [] };
            }

            callouts[name].total++;
            callouts[name].sentiment += sentimentality.score;
            callouts[name].lines.push(sentence);
            lastName = name;
          }

          if(!usedWords[word]) usedWords[word] = 0;

          // if the word isn't a letter, is not a common word, and is being
          // said for the first time
          if(word.length > 1 && commonWords.indexOf(word) < 0 && !usedWords[word]) {
            uniqueWords.push(word);
          }

          usedWords[word]++;
        });

        // Naive attempt for most negative line
        if(!mostSentimentalLines.negative ||
          sentimentality.score < mostSentimentalLines.negative.score) {

          _.extend(mostSentimentalLines, {
            negative: _.extend(
              _.pick(sentimentality, 'score', 'comparative'),
              { line: sentence }
            )
          });
        }

        // Naive attempt for most positive line
        if(!mostSentimentalLines.positive ||
          sentimentality.score > mostSentimentalLines.positive.score) {
          
          _.extend(mostSentimentalLines, {
            positive: _.extend(
              _.pick(sentimentality, 'score', 'comparative'),
              { line: sentence }
            )
          });
        }
      });
    });
    
    // create new tfidf corpus for speaker
    tfidf = new TfIdf();
    // each response from the speaker is considered a document
    _.each(speaker.lines, tfidf.addDocument, tfidf);

    // Update debate-wide values
    totalEstimatedTime += Math.round(totalWords/WPM);
    collectiveTotalWords += totalWords;
    collectiveUniqueWords = _.uniq(_.merge(collectiveUniqueWords, uniqueWords));
    _.each(usedWords, function(count, word) {
      if(!collectiveUsedWords[word]) collectiveUsedWords[word] = 0;
      collectiveUsedWords[word] += count;
    });
    
    // not adding commentators and questioners to the report
    if(speaker.isCandidate === false) return;

    data.push({
      name: speaker.name,

      totalWords: totalWords,
      speakingTime: Math.round(totalWords/WPM),

      emotionalLines: mostSentimentalLines,

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
      ),

      callouts: callouts
    });
  });
  
  fs.writeFileSync(
    path.join(REPORTS_PATH, _.kebabCase(debate.name.replace('#', '-') + '-' + debate.date) + '.json'),
    JSON.stringify({
      name: debate.name,
      estimatedLength: totalEstimatedTime,
      totalWordsSpoken: collectiveTotalWords,
      mostUniqueWords: _.map(
        _.sortBy(
          _.map(collectiveUniqueWords, function(val, key) { return [val, key]; }),
          function(data) { return collectiveUsedWords[data[0]]; }
        ).slice(0,40),
        _.first
      ),
      candidates: data
    }, null, 2)
  );
});
