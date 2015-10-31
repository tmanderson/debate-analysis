'use strict';

var _ = require('lodash');

var dictionaries = require('../dictionaries');
var tokenizers = require('../tokenizers');

var candidateMatchers = _.reduce(dictionaries.candidates, function(matchers, name) {
  var n = name.split(' ');
  matchers[name] = new RegExp([ n[0], '? (?=', n[1], ')' ].join(''), 'ig');
  return matchers;
}, {});

module.exports = function callouts(lines) {
  var matches;

  return _.reduce(lines, function(callouts, line) {
    _.each(tokenizers.sentence(line), function(sentence) {
      _.each(candidateMatchers, function(matcher, name) {
        if(matcher.test(sentence)) {
          if(!callouts[name]) callouts[name] = [];
          callouts[name].push(sentence);
        }
      });
    });

    return callouts;
  }, {});
};