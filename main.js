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
var tokenizers = require('./src/tokenizers');
var analysers = require('./src/analysers');
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

_.mixin({
  filterValues: function(object, predicate) {
    var output = _.clone(object);

    _.each(object, function(val, key, object) {
      if((predicate && !predicate(val, key, object)) ||
        (val === null || val === undefined || _.isArray(val) && !val.length)) {
        delete output[key];
      }
    });

    return output;
  },

  sortByValue: function(object, iteratee, limit, dir, thisArg) {
    if(_.isNumber(iteratee)) {
      thisArg = dir;
      dir = limit;
      limit = iteratee;
      iteratee = null;
    }
    else if(_.isString(iteratee)) {
      thisArg = limit;
      dir = iteratee;
    }

    _.zipObject(
        _.sortBy(
          _.pairs(object), function(pair) {
            return iteratee && iteratee.apply(this, pair.reverse()) : pair[1];
          }, thisArg || this
        )
      ).slice(0, limit)
    }
  }
});

function writeJSONSync(path, obj) {
  return fs.writeFileSync(path, JSON.stringify(obj, null, 2));
}

_.each(debates, function(debate) {
  var stats = {
    name: debate.name,
    
    estimatedLength: 0,
    totalWordsSpoken: 0,
    totalUniqueWords: 0,
    words: []
  };

  debate
    .tokenize(tokenizers.sentences)
    .analyse(analysers);

  writeJSONSync(
    path.join(REPORTS_PATH, _.kebabCase(debate.name.replace('#', '-') + '-' + debate.date) + '.json'),
    _.extend(stats, {
      candidates: _.mapValues(debate.participants, function(participant) {
        return _.filterValues(
          _.reduce(analysers, function(data, a) {
            _.set(data.output, a.name, a(data.context));
            return data;
          }, {
            context: {
              debate: stats,
              participant: participant,
              lines: participant.lines,
              sentences: _.flatten(_.map(participant.lines, tokenizers.sentence))
            },
            output: {}
          }).output
        );
      })
    })
  );
});
