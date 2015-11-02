'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var transcripts = fs.readdirSync(path.join('./', TRANSCRIPT_PATH));

function Debate(transcriptFilename, options) {
  _.extend(this, JSON.parse(
    fs.readFileSync(
      path.join(TRANSCRIPT_PATH, transcriptFilename))
    )
  );

  this.loadPartyData();
  this.assignParticipantLines();
}

_.extend(Debate.prototype, {
  loadPartyData: function loadPartyData() {
    var party = _.find(DEBATE_PARTIES, function(party) {
      return (new RegExp(party, 'i')).test(this.name);
    }, this);

    var filepath = path.join('./', CANDIDATES_PATH, party + '-party.json');

    if(!fs.existsSync(filepath)) return;

    this.party = JSON.parse(fs.readFileSync(filepath));
    
    this.participants = _.mapKeys(
      _.filter(this.party.candidates, function(candidate) {
        return _.find(this.participants, function(name) {
          return name.toLowerCase().indexOf(candidate.name.toLowerCase()) > -1;
        }, this);
      }, this),
      function(participant) {
        return participant.name.split(' ').pop().toLowerCase();
      }
    );

    this.moderators = _.mapKeys(
      _.map(this.moderators, function(name) {
        return { name: name, isCandidate: false };
      }),
      function(moderator) {
        return moderator.name.split(' ').slice(-2).shift().toLowerCase();
      }
    );
  },

  getParticipant: function getCandidate(name) {
    return this.participants[name] || this.moderators[name];
  },

  assignParticipantLines: function assignParticipantLines() {
    _.each(this.dialog, function(line) {
      var participant = this.getParticipant(_.keys(line)[0]);
      if(!participant) return;

      if(!participant.lines) participant.lines = [];
      participant.lines.push(_.values(line)[0]);
    }, this);
  },

  /**
   *  Add another property to the participant (e.g. `sentences`)
   */
  tokenize: function() {
    var tokenizers = _.flatten(_.toArray(arguments));

    _.each(tokenizers, function(tokenizer) {
      _.each(this.participants, function(participant) {
        participant[tokenizer.name] = tokenizer(participant.lines.join(' '));
      });
    });
  },

  analyse: function(/*analyser, analyser..*/) {
    var analysers = _.flatten(_.toArray(arguments).slice(1));

    return _.map(this.participants, function(participant) {
      return _.reduce(analysers, function(output, analyser) {
        return _.merge(output,
          (_.isFunction(analyser) ? analyser({}, participant) : analyser(participant)).run()
        );
      }, {});
    });
  }
});

Debate.getAllForParty = function(party) {
  return _.map(
    _.filter(transcripts, function(transcript) {
      return transcript.indexOf(party) >= 0;
    }),
    function(debate) {
      return new Debate(debate);
    }
  );
};

module.exports = Debate;