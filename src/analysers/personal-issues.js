'use strict';

var _ = require('lodash');
var natural = require('natural');
var TfIdf = natural.TfIdf;

var dictionaries = require('../dictionaries');

module.exports = function personalIssues(context) {
  return _.zipObject(
    _.sortBy(
      _.map(context.participant.issues, function(issue) {
        var docs = context.tfidf.tfidfs(issue);
        return [ issue, (_.reduce(docs, _.add, 0) / 100).toFixed(2) ];
      }),
      function(val) {
        return val[1];
      }
    ).reverse()
  );
};