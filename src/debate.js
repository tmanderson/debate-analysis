'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var transcripts = _.map(
  fs.readdirSync(path.join('./', TRANSCRIPT_PATH)),
  function(file) {
    var dateComponents = file.match(/\d+/g).slice(-3);

    return {
      filename: file,

      date: {
        year: dateComponents[0],
        month: dateComponents[1],
        day: dateComponents[2]
      },

      load: function() {
        var filepath = path.join('./', TRANSCRIPT_PATH, file);
        return (this.load = JSON.parse(fs.readFileSync(filepath)));
      }
    }
  }
);

function Debate(transcript) {
  this.name = transcript.filename.replace(/-/g, ' ').replace('json', '');
  this.transcript = transcript;
  this.speakers = {};

  this.loadDebate();
}

_.extend(Debate.prototype, {
  getCandidate: function getCandidate(name) {
    if(this.speakers[name]) return this.speakers[name];

    var data, filepath = path.join('./', CANDIDATES_PATH, name + '.json');

    if(!fs.existsSync(filepath)) {
      data = { name: name, isCandidate: false };
    }
    else {
      data = JSON.parse(fs.readFileSync(filepath));
    }

    return (this.speakers[name] = data);
  },

  loadDebate: function loadDebate() {
    _.each(this.transcript.load(), function(line) {
      var speaker = this.getCandidate(_.keys(line)[0]);
      if(!speaker) return;

      if(!speaker.lines) speaker.lines = [];
      speaker.lines.push(_.values(line)[0]);
    }, this);
  },

  forEachSpeaker: function(process) {
    _.each(this.speakers, process);
  }
});

Debate.getAllForParty = function(party) {
  return _.map(
    _.filter(transcripts, function(transcript) {
      return transcript.filename.indexOf(party) >= 0;
    }),
    function(debate) {
      return new Debate(debate);
    }
  );
};

module.exports = Debate;