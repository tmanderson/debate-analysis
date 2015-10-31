'use strict';

var _ = require('lodash');
var natural = require('natural');
var TfIdf = natural.TfIdf;

var dictionaries = require('../dictionaries');

module.exports = function personalIssues(lines, participant) {
  var tfidf = new TfIdf();
  _.each(lines, tfidf.addDocument, tfidf);

  return _.zipObject(
    _.sortBy(
      _.map(participant.issues, function(issue) {
        var docs = tfidf.tfidfs(issue);
        return [ issue, (_.reduce(docs, _.add, 0) / 100).toFixed(2) ];
      }),
      function(val) {
        return val[1];
      }
    ).reverse()
  );

  // return _.zipObject(
  //   _.filter(
  //     tfidf.listTerms(0).map(function(item, i) {
  //       return [ item.term, item.tfidf ];
  //     }),
  //     function(line) {
  //       return !_.includes(dictionaries.common, line[0]);
  //     }
  //   );
  // )
};