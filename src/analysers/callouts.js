'use strict';

var _ = require('lodash');

var dictionaries = require('../dictionaries');
var tokenizers = require('../tokenizers');

var candidateMatchers = _.reduce(dictionaries.candidates, function(matchers, name) {
  var n = name.split(' ');
  matchers[name] = new RegExp([ n[0], '? (?=', n[1], ')' ].join(''), 'ig');
  return matchers;
}, {});

module.exports = function callouts(context) {
  return _.reduce(context.sentences, function(callouts, sentence) {
    _.each(candidateMatchers, function(matcher, name) {
      if(matcher.test(sentence)) {
        if(!callouts[name]) callouts[name] = [];
        callouts[name].push(sentence);
      }
    });

    return callouts;
  }, {});
};