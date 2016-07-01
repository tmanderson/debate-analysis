'use strict';

var _ = require('lodash');
var b = require('bluebird');
var fs = require('fs');
var path = require('path');
var utils = require('./utils');
var moment = require('moment');
var parsers = require('../parsers');

var makeRequest = utils.request;

var TRANSCRIPT_LISTING_URL = 'http://www.presidency.ucsb.edu/debates.php';
var TRANSCRIPT_TEXT_SELECTOR = 'table[height] .displaytext';
var TRANSCRIPT_PATH = path.join(process.cwd(), 'data/transcripts');

function createDebateObj($link, date) {
  var text = $link.text().split(' in ');

  return {
    name: text.shift(),
    location: text.shift(),
    date: date,
    url: $link.attr('href'),
    dialog: []
  };
}

function saveTranscriptsTo(writePath, transcripts) {
  return b.each(transcripts, function(transcript) {
    var deferred = b.defer();

    fs.writeFile(
      // file name is 'name-of-debate-{debate-num?}-2016-01-01'
      path.join(writePath, _.kebabCase(transcript.name.replace(/#(\d)/, '-$1-') + transcript.date) + '.json'),
      JSON.stringify(transcript, null, 2),
      function(err) {
        if(!err) return deferred.resolve(transcript);
        deferred.reject(err);
      }
    );

    return deferred.promise;
  });
}

function requestAndProcessTranscripts(transcripts) {
  return b.map(_.pluck(transcripts, 'url'), makeRequest)
    .spread(function() {
      return _.map(arguments, function($, i) {
        return _.extend(transcripts[i], {
          dialog: $(TRANSCRIPT_TEXT_SELECTOR).text()
        });
      });
    });
}

function getDebateLinksForYear(year, limit, $) {
  console.log('GETTING DEBATE TRANSCRIPTS FOR %s', year);

  var links = _.flatten(
    $('tr td.docdate').filter(function(i) {
      return (
        this.textContent.indexOf(year-1) > -1 ||
        this.textContent.indexOf(year) > -1
      );
    })
    .map(function() {
      var $link, date, text, debates = [];
      var $this = $(this);

      $link = $this.next().find('a');

      if(!$link.length) return;

      date = moment(_.trim(this.textContent), 'MMMM Do, YYYY').format('YYYY-MM-DD');
      debates.push(createDebateObj($link, date));

      $link = $this.parent().next().find('a');

      if($link.length && $this.attr('rowspan') > 1) {
        debates.push(createDebateObj($link, date));
        debates.reverse();

        debates[0].name += ' #1';
        debates[1].name += ' #2';
      }

      return debates;
    })
    .get()
  );

  // limit of 0 will get all debates
  return links.slice(0, limit > 0 ? limit : links.length);
}

module.exports = function getTranscripts(electionYear, party, count) {
  count = count || !_.isNaN(parseInt(party)) && party || 0;
  party = _.isString(party) && party || null;

  return makeRequest(TRANSCRIPT_LISTING_URL)
    .then(_.partial(getDebateLinksForYear, electionYear, count))
    .then(requestAndProcessTranscripts)
    .then(function(transcripts) {
      return _.map(transcripts, function(transcript) {

        transcript.dialog = parsers.transcript(transcript.dialog);

        var line = transcript.dialog.shift()

        transcript.participants = _.filter(
          _.map(
            (line.participants || line.panelists).split(';'),
            function(name) {
              if(!name) return;

              var chunks = name.split(' ');
              var last = chunks.slice(-1)[0];

              if(last.charAt(0) === '(') return chunks.slice(-3).join(' ');
              return chunks.slice(-2).join(' ');
            }
          )
        );

        var line = transcript.dialog.shift()

        transcript.moderators = _.filter(
          _.map(
            (line.moderators || line.moderator).split(';'),
            function(name) {
              return _.trim(name.replace('and', ''));
            }
          )
        );

        return transcript;
      });
    })
    .then(_.partial(saveTranscriptsTo, TRANSCRIPT_PATH));
};
