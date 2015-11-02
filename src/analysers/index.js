'use strict';

var _ = require('lodash');

_.extend(module.exports, {
  audienceReception: require('audience-reception'),
  averageWords: require('average-words'),
  callouts: require('callouts'),
  emotionalLines: require('emotional-lines'),
  index: require('index'),
  personalIssues: require('personal-issues'),
  speakingTime: require('speaking-time'),
  tfidf: require('tfidf'),
  totalWords: require('total-words'),
  uniqueWords: require('unique-words'),
  usedWords: require('used-words')
});