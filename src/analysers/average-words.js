'use strict';

var _ = require('lodash');
var dictionaries = require('../dictionaries');

function AverageWordUseAnalyser(options, participant) {
  _.extend(this, _.defaults(options, {
    commonWords: false,
    decimalPlaces: 4,
    participant: participant
  });
}

_.extend(AverageWordUseAnalyser.prototype, {
  _val: null,

  run: function() {
    return this.value(
      _.mapValues(this.participant.wordFrequencies, function(count) {
        return (count / this.participant.uniqueWords.length).toFixed(4);
      })
    );
  },

  value: function() {
    if(arguments.length) this._val = arguments[0];
    return { averageWordUse: this._val };
  }
});

AverageWordUseAnalyser.avg = _.curry(
  function createAnalyser(options, participant) {
    return new AverageWordUseAnalyser(options, participant);
  })
);

module.exports = AverageWordUseAnalyser.avg;