'use strict';

var _ = require('lodash');

var applauseRE = /\[applause\]/ig;
var laughterRE = /\[laughter\]/ig;

function AudienceReceptionAnalyser(options, participant) {
  _.extend(this, _.defaults(options, {
    _val: {},
    applause: true,
    laughter: true,
    participant: participant
  });

  if(this.applause) this._val.applause = [];
  if(this.laughter) this._val.laughter = [];
}

_.extend(AudienceReceptionAnalyser.prototype, {
  _val: null,

  run: function(lines) {
    return this.value(
      _.reduce(this.participant.sentences, function(reactions, sentence) {
        reactions.applause.push.call(reactions.applause, (sentence.match(applauseRE) && sentence || null));
        reactions.laughter.push.call(reactions.laughter, (sentence.match(laughterRE) && sentence || null));
        
        return _.mapValues(reactions, function(v) { return _.filter(v, _.identity); });
      }, this.value())
    );
  },

  value: function() {
    if(arguments.length) this._val = arguments[0];
    return { averageWordUse: this._val };
  }
});

AudienceReceptionAnalyser.reception = _.curry(
  function createAnalyser(options, participant) {
    return new AverageWordUseAnalyser(options, participant);
  })
);

module.exports = AudienceReceptionAnalyser.reception;