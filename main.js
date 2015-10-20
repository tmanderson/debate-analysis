'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var natural = require('natural');
var TfIdf = natural.TfIdf;

var format = require('./src/format');

var reportsPath = './reports';
var positionsPath = './data/candidates';
var transcriptPath = './data/transcripts';

var candidates = _.map(fs.readdirSync(positionsPath), function(file) { return file.split('.')[0]; });

function Debate(party, year, month, day) {
  var nametpl = _.template('<%=party%>-debate-<%=year%>-<%=month%>-<%=day%>');

  this.name = nametpl({
    party: party,
    year: year,
    month: month < 10 ? '0' + month : month,
    day: day < 10 ? '0' + day : day
  });

  this.speakers = {};

  this.loadDebate();
  this.loadPositions();
}

_.extend(Debate.prototype, {
  loadPositions: function loadPositions() {
    this.issues = JSON.parse(fs.readFileSync('./data/issues.json'));

    // holds the positions of the debate speakers (each contained in a file under `data/candidates`)
    this.positions = _.mapValues(this.speakers, function(text, name) {
      var candidate = path.join(positionsPath, name + '.json');
      if(!fs.existsSync(candidate)) return null;
      console.log(name);
      return JSON.parse(fs.readFileSync(candidate)).issues || [];
    }, this);
  },

  loadDebate: function loadDebate() {
    _.each(
      JSON.parse(fs.readFileSync(path.join(transcriptPath, this.name + '.json'))),
      function(line) {
        var speaker = _.keys(line)[0].toLowerCase();
        if(!this.speakers[speaker]) this.speakers[speaker] = [];
        this.speakers[speaker].push(_.values(line)[0]);
      },
      this
    );
  },

  forEachSpeaker: function(process) {
    _.each(this.speakers, process);
  }
});

var debates = [
  new Debate('democratic', 2015, 10, 13),
  new Debate('republican', 2015, 8, 6),
  new Debate('republican', 2015, 9, 16)
];

var headings = [ 'Issue', 'Average Weight (tf-idf)' ];

_.each(debates, function(debate) {
  var tfidf, docs;
  var output = ['# ' + _.capitalize(debate.name.replace(/([a-z])-/ig, '$1 ')) ];

  debate.forEachSpeaker(function(lines, speaker) {
    if(!debate.positions[speaker]) return;

    tfidf = new TfIdf();
    // add each response from the speaker to the corpus
    _.each(lines, tfidf.addDocument, tfidf);
    // CL formatting, just to make output easier to read
    lines = _.map(_.range(40-(speaker.length-2)/2), _.constant('-')).join('');
    // output the speaker's name surrounded by `---`
    output.push('\n\n## ' + _.capitalize(speaker));

    output.push.apply(output,
      tfidf.listTerms(0).map(function(item, i) {
        return (i+1) + '. ' + item.term;
      }).slice(0, 10)
    );

    // go through the speaker's positions and find average weight of each position
    output.push(
      '\n',
      format.makeTable(
        headings,
        _.sortBy(
          _.map(debate.positions[speaker], function(issue) {
            docs = tfidf.tfidfs(issue);
            return [ issue, _.reduce(docs, _.add, 0)/docs.length ];
          }),
          function(val) {
            return val[1];
          }
        ).reverse() // issue spoken about most -> least
      )
    );
  });

  fs.writeFileSync(path.join(reportsPath, debate.name + '.md'), output.join('\n'));
});
