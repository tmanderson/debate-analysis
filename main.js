'use strict';

var _ = require('lodash');
var fs = require('fs');
var natural = require('natural');
var wordFrequency = require('./src/frequency');
var speakers = {};

_.each(
  JSON.parse(fs.readFileSync('./data/democratic-debate-2015-10-13.json')),
  function(line) {
    var speaker = _.keys(line)[0].toLowerCase();
    if(!speakers[speaker]) speakers[speaker] = [];
    speakers[speaker].push(_.values(line)[0]);
  }
);

_.each(speakers, function(lines, speaker) {
  console.log('%s: ', speaker);
  console.log(wordFrequency.counts(lines));
  console.log(wordFrequency.tfidf(lines));
});