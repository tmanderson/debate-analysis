'use strict';

var _ = require('lodash');
var fs = require('fs');
var natural = require('natural');
var TfIdf = natural.TfIdf;
var format = require('./src/format');
var speakers = {};

var positions = _.mapKeys(
  JSON.parse(fs.readFileSync('./data/candidates/positions.json')),
  function(v, k) {
    return k.toLowerCase();
  }
);

_.each(
  JSON.parse(fs.readFileSync('./data/transcripts/democratic-debate-2015-10-13.json')),
  function(line) {
    var speaker = _.keys(line)[0].toLowerCase();
    if(!speakers[speaker]) speakers[speaker] = [];
    speakers[speaker].push(_.values(line)[0]);
  }
);

var tfidf, docs;
var headings = ['Issue', 'Average Weight (tf-idf)'];
var output = [];

_.each(speakers, function(lines, speaker) {
  if(!positions[speaker]) return;
  tfidf = new TfIdf();
  // add each response from the speaker to the corpus
  _.each(lines, tfidf.addDocument, tfidf);
  // CL formatting, just to make output easier to read
  lines = _.map(_.range(40-(speaker.length-2)/2), _.constant('-')).join('');
  // output the speaker's name surrounded by `---`
  output.push('\n\n## ' + _.capitalize(speaker));

  output.push('Most important words spoken:');

  output.push.apply(output,
    tfidf.listTerms(0).map(function(item) {
      return '  - ' + item.term;
    }).slice(0, 10)
  );

  // go through the speaker's positions and find average weight of each position
  output.push(
    '\n',
    format.makeTable(
      headings,
      _.sortBy(
        _.map(positions[speaker], function(issue) {
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

fs.writeFileSync('./reports/democratic-debate-2015-10-13.md', output.join('\n'));