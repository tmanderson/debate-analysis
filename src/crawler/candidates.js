'use strict';

var _ = require('lodash');
var b = require('bluebird');
var fs = require('fs');
var URL = require('url');
var path = require('path');
var utils = require('./utils');
var moment = require('moment');

var WIKI_LANG = process.env.WIKI_LANG || 'en';
var WIKI_HOST = ['https://' + WIKI_LANG, 'wikipedia', 'org/wiki/'].join('.');

var PARTY_INFO_PATH = path.join(process.cwd(), 'data');
var DEBATE_PARTIES = ['democratic', 'republican'];
var POTENTIAL_ISSUE_PATHS = [ '/issues', '/policy', '/category/issues', '/category/policy', '/on-the-issues', '/positions', '/records', '/campaign-issues', '/' ];

var makeRequest = utils.request;
var pageExists = utils.pageExists;

function rejectedPromise(text) {
  var deferred = b.defer();
  b.resolve(text || '{}');
  return deferred.promise;
}

function createPartyObj(party, candidates) {
  return {
    name: _.capitalize(party),
    compiled: moment().format('YYYY-MM-DD'),
    candidates: candidates
  };
}

function resolveIssueUrl(website, paths, previous) {
  var url = URL.parse(website);

  paths = arguments[1] || POTENTIAL_ISSUE_PATHS;
  
  if(!paths.length) return rejectedPromise();

  url.pathname = paths.shift();

  if(URL.format(url) === previous) return rejectedPromise();

  // If the promise succeeds, we've resolved (200) an issue URL
  // If the promise is rejected, continue down our potential paths.
  return pageExists(url).then(
    function(val) {
      console.log('found %s', val);
      return val;
    },
    _.partial(resolveIssueUrl, URL.format(url), paths, URL.format(url))
  );
}

function writePartyFilesTo(writePath, parties) {
  var names = _.keys(parties);

  return b.each(_.values(parties), function(info, i) {
    var deferred = b.defer();
    var partyData = createPartyObj(names[i], info);

    fs.writeFile(
      path.join(writePath, partyData.name.toLowerCase() + '-party.json'),
      JSON.stringify(partyData, null, 2),
      function(err) {
        if(!err) return deferred.resolve(true);
        deferred.reject(err);
      }
    );

    return deferred.promise;
  });
}

function getPartyElectionInfoURL(party, year) {
  return WIKI_HOST + _.capitalize(party.toLowerCase()) + '_Party_presidential_candidates,_' + year;
}

function getCandidateInfo(party, $) {
  return $('table.wikitable.sortable tbody').first().map(function() {
    return $(this).children('tr').map(function() {
      var $cells = $(this).find('td');
      var deferred = b.defer();

      var candidateInfo = {
        name: _.trim($cells.first().find('a').last().text()),
        website: $cells.eq($cells.length-2).find('a.external').attr('href'),
        party: party
      };

      if(candidateInfo.website) {
        return resolveIssueUrl(candidateInfo.website)
          .then(_.partial(_.set, candidateInfo, 'issuesUrl'));
      }
      else {
        return rejectedPromise();
      }
    }).get();
  }).get();
}

module.exports = function getCandidates(electionYear) {
  return b.all(
    _.map(DEBATE_PARTIES, function(party) {
      return makeRequest(getPartyElectionInfoURL(party, electionYear));
    })
  ).spread(function() {
    var parties = _.toArray(arguments);
    var requests = _.flatten(
      _.map(parties, function($partyWikiPage, i) {
        return getCandidateInfo(DEBATE_PARTIES[i], $partyWikiPage);
      })
    );
    
    return b.all(requests);
  })
  .then(function(candidates) {
    console.log(candidates);
    // return writePartyFilesTo(
    //   PARTY_INFO_PATH,
    //   _.values(_.groupBy(candidates, 'party'))
    // );
  }, function(err) { console.log(err); });
};