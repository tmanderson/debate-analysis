'use strict';

var _ = require('lodash');
var b = require('bluebird');
var fs = require('fs');
var URL = require('url');
var path = require('path');
var utils = require('./utils');
var moment = require('moment');
var parsers = require('../parsers');

var PARTY_INFO_PATH = path.join(process.cwd(), 'data');
var DEBATE_PARTIES = ['democratic', 'republican'];
var INVALID_ISSUE_TEXT = ['issue', 'donate', 'governor', 'senator', 'links'];

var makeRequest = utils.request;

function loadPartyData() {
  return b.map(_.values(DEBATE_PARTIES), function(partyName) {
    var deferred = b.defer();

    fs.readFile(
      path.join(PARTY_INFO_PATH, partyName + '-party.json'),
      function(err, buff) {
        if(!err) return deferred.resolve(JSON.parse(buff.toString()));
        deferred.reject(err);
      }
    );

    return deferred.promise;
  });
}

function getPartyCandidateIssueUrls(parties) {
  return b.map(parties, function(party) {
    return b.map(party.candidates, function(candidate) {
      if(candidate.issuesUrl) return candidate;

      return findIssuesUrl(candidate.website)
        .then(function(url) {

          return _.extend(candidate, {
            issuesUrl: url
          });
        });
    });
  });
}

function getAndProcessCandidateIssues(parties) {
  return b.map(parties, function(party) {
    return b.map(party.candidates, function(candidate) {
      return makeRequest(candidate.issuesUrl)
        .then(_.partial(parseIssuesForCandidate, candidate))
        .then(_.partial(_.set, candidate, 'issues'));
    });
  });
}

function cleanIssueText(textLines, blacklist) {
  var issueRE = new RegExp( INVALID_ISSUE_TEXT.concat(blacklist||'').join('|'), 'ig');

  return _.unique(
    _.filter(
      _.map(
        _.flatten(textLines),
        function(text) {
          return _.trim(text).replace(/[\r\t]+/g, '').replace(/\n{2,}/g, '\n');
        }
      ),
      function(text) {
        return text.length && !issueRE.test(text);
      }
    )
  );
}

function parseIssuesForCandidate(candidate, $) {
  var issues;

  issues = cleanIssueText(
    $('[role="main"], main').map(function() {
      return $(this).find('h1, h2, h3').map(function() {
        return this.textContent;
      }).get();
    }).get(),
    candidate.name.split(' ')
  );

  if(issues.length) return issues;
  
  issues = cleanIssueText(
    // Paul: `.issues + section`
    $('[class*="issue"], [class*="position"], [class*="record"], [class*="policy"], .issues + section, #sidebar-inner')
      .map(function() {
        // Lessig: `p > strong > a`
        // Huckabee: `.related-links li a`
        // Hillary: `hr + br + p`
        return $(this).find('h1, h2, h3, p > strong > a, hr + br + p, .related-links li a').map(function() {
          return this.textContent;
        }).get();
      }).get(),
      candidate.name.split(' ')
    );

  if(issues.length) return issues;

  // jindal
  issues = $('.post_content_section p + h2 > span > strong')
    .map(function() { return this.textContent; }).get();

  if(issues.length) return issues;

  issues = cleanIssueText(
    $('h1, h2, h3').map(function() { return this.textContent; }).get(),
    candidate.name.split(' ')
  );
}

module.exports = function getCandidateIssues() {
  var partyData;

  return loadPartyData()
    .then(function(parties) {
      return (partyData = parties);
    })
    .then(getPartyCandidateIssueUrls)
    .then(getAndProcessCandidateIssues)
    .then(function() {
      console.log(arguments);
    });
};