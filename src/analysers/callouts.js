'use strict';

var _ = require('lodash');
var dictionaries = require('../dictionaries');

var candidateMatchers = _.reduce(dictionaries.candidates, function(matchers, name) {
  var n = name.split(' ');
  matchers[name] = new RegExp([ n[0], '? (?=', n[1], ')' ].join(''), 'ig');
  return matchers;
}, {});

module.exports = function callouts(lines) {
  var matches;

  return _.reduce(lines, function(callouts, line) {
    _.each(candidateMatchers, function(matcher, name) {
      if(matcher.test(line)) {
        if(!callouts[name]) callouts[name] = [];
        callouts[name].push(line);
      }
    });

    return callouts;
  }, {});
};