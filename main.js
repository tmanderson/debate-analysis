'use strict';

var _ = require('lodash');

/**
 * This is a discreet way of saying "don't use this with other code"
 * If somehow this ever gets into some application, this can change.
 */
_.extend(global, {
  WPM: 190,
  RESULT_LIMIT: 20,
  REPORTS_PATH: './reports',
  CANDIDATES_PATH: './data',
  TRANSCRIPT_PATH: './data/transcripts',
  DEBATE_PARTIES: ['democratic', 'republican']
});

var fs = require('fs');
var path = require('path');
var args = process.argv.slice(2);

var sentiment = require('sentiment');
var sentenceTokenizer = require('./src/tokenizers').sentence;

var Debate = require('./src/debate');

var dictionaries = require('./src/dictionaries');
var limiters = require('./src/limiters');
var filters = require('./src/filters');

var commonWords = dictionaries.common;
var candidates = dictionaries.candidates;

var debates = [].concat(Debate.getAllForParty('democratic')).concat(Debate.getAllForParty('republican'));

function getNormalizedCandidateName(value) {
  return _.find(candidates, function(name) {
    name = name.split(' ');
    return (name[0] === value.toLowerCase() || name[1] === value.toLowerCase());
  });
}

var analysers = [
  require('./src/analysers/total-words'),
  require('./src/analysers/used-words'),
  require('./src/analysers/unique-words'),
  require('./src/analysers/callouts'),
  require('./src/analysers/audience-reception'),
  require('./src/analysers/speaking-time'),
  require('./src/analysers/emotional-lines'),
  require('./src/analysers/personal-issues'),
  require('./src/analysers/average-words')
];

_.each(debates, function(debate) {
  var value, stats, exclude = [];
  
  var collectiveTotalWords = 0;
  var collectiveUsedWords = {};
  var collectiveUniqueWords = [];
  var totalEstimatedTime = 0;
  var totalUniqueWords = 0;

  var data = _.mapValues(debate.participants, function(participant) {
    stats = _.reduce(analysers, function(output, analyser) {
      value = analyser.call(output, participant.lines, participant);
      
      if(output.include === false) {
        exclude.push(analyser.name);
        output.include = true;
      }

      return _.set(output, analyser.name, value);
    }, {});

    totalEstimatedTime += parseFloat(stats.speakingTime);
    totalUniqueWords += stats.uniqueWords.length;
    collectiveTotalWords += _.reduce(stats.usedWords, function(total, val) {
      return total + (val || 0);
    }, 0);

    _.each(exclude, function(name) {
      delete stats[name];
    });

    delete stats.include;

    return _.mapValues(stats, function(val, k) {
      switch(k) {
        case 'uniqueWords':
          return {
            total: val.length,
            mostUnique: val.slice(0, 20)
          };
        default:
          if(_.isObject(val)) {
            if(_.isNumber(_.values(val)[0])) {
              return limiters.numberDict(val, RESULT_LIMIT);
            }
          }

          if(_.isArray(val)) return val.slice(0, RESULT_LIMIT);

          return val;
      }
    });
  });

  fs.writeFileSync(
    path.join(REPORTS_PATH, _.kebabCase(debate.name.replace('#', '-') + '-' + debate.date) + '.json'),
    JSON.stringify({
      name: debate.name,
      estimatedLength: totalEstimatedTime,
      totalWordsSpoken: collectiveTotalWords,
      totalUniqueWords: totalUniqueWords,
      candidates: data
    }, null, 2)
  );
});
