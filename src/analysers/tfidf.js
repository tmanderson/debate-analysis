'use strict';

var _ = require('lodash');

var natural = require('natural');
var TfIdf = natural.TfIdf;

module.exports = function tfidf(context) {
  _.set(context, 'tfidf', new TfIdf());
  _.each(context.lines, context.tfidf.addDocument, context.tfidf);
};