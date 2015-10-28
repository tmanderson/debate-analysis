'use strict';

var WIKI_LANG = process.env.WIKI_LANG || 'en';

var _ = require('lodash');
var b = require('bluebird');
var fs = require('fs');
var URL = require('url');
var path = require('path');
var jsdom = require('jsdom');
var moment = require('moment');

var DEBATE_PATH = 'data/debates';
var WIKI_HOST = ['https://' + WIKI_LANG, 'wikipedia', 'org/wiki/'].join('.');
var PROTOCOLS = { 'https:': require('https'), 'http:': require('http') };

function pageExists(url) {
  var deferred = b.defer();

  PROTOCOLS[url.protocol].get(URL.format(url), function(res) {
    if(/^(2|3)/.test(res.statusCode)) {
      deferred.resolve(URL.format(url));
    }
    else {
      deferred.reject({ code: res.statusCode });
    }
  });

  return deferred.promise;
}

/**
 * Makes an attempt to find a candidates' claimed "issues" page, given their
 * domain.
 * @param  {String} website - The website of the candidate
 * @return {Promise}          Finds the issue url.
 */
function findIssuesUrl(website) {
  var url = URL.parse(website);
  var paths = arguments[1] || [ '/issues', '/policy', '/category/issues', '/category/policy', '/on-the-issues', '/positions', '/records', '/campaign-issues', '/' ];

  url.pathname = paths.shift();
  return pageExists(url).then(_.identity, _.partial(findIssuesUrl, URL.format(url), paths));
}

function makeRequest(url) {
  var deferred = b.defer();

  if(!url) {
    deferred.reject('Invalid URL');
    return deferred.promise;
  }
  
  jsdom.env(url, ['http://code.jquery.com/jquery.js'], {
    done: function(err, window) {
      if(err) return deferred.reject(err);
      deferred.resolve(window.$);
    }
  });

  return deferred.promise;
}

function writeCandidateFile(filename, data) {
  var deferred = b.defer();

  fs.writeFile(
    path.join(__dirname, '../data/candidates', filename + '.json'),
    JSON.stringify(data, null, 2),
    function(err) {
      if(err) { console.log(err); deferred.reject(err); }
      deferred.resolve();
    }
  );

  return deferred.promise;
}

var NOT_ISSUES = ['issue', 'donate', 'governor', 'senator', 'links'];

function cleanIssueText(textLines, blacklist) {
  var issueRE = new RegExp( NOT_ISSUES.concat(blacklist||'').join('|'), 'ig');

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

function parseIssues($, candidate) {
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

function getDebateLinks($) {
  var $this = $(this);
  var link = $this.next().find('a');

  if(!link.length) return;

  var date = moment(_.trim(this.textContent), 'MMMM Do, YYYY').format('YYYY-MM-DD');

  var debates = [
    {
      name: link.text(),
      date: date,
      url: link.attr('href')
    }
  ];

  link = $this.parent().next().find('a');

  if(link.length && $this.attr('rowspan') > 1) {
    debates[0].name += ' #2';

    debates.push({
      name: link.text() + ' #1',
      date: date,
      url: link.attr('href')
    });
  }

  return debates;
}

var speakerRE = /[A-Z]+:/g;

function processDebateHTML(debate, filename) {
  if(_.isString(debate)) {
    var url = debate;

    debate = filename.split('-');

    debate = {
      name: debate.slice(0, debate.length-3).join(' '),
      date: debate.slice(-3).join(' ').replace('.html', ''),
      url: url
    };
  }

  return makeRequest(debate.url)
    .then(function($) {

      if(debate.url) {
        var filename = [_.kebabCase(debate.name), debate.date].join('-');
        fs.writeFileSync(
          path.join('./', DEBATE_PATH, 'raw', filename + '.html'),
          $('html')[0].outerHTML
        );
      }

      var $content = $('.displaytext');
      var text = $content.text();
      var lines = [];
      var speakerMatch, name;
      
      while((speakerMatch = speakerRE.exec(text))) {
        if(name) {
          lines.push(
            _.set({}, name, _.trim(text.substr(speakerRE.lastIndex + name.length, speakerMatch.index)))
          );
        }
        
        name = speakerMatch[0];
      }
      
      return lines;
    });
}

_.extend(module.exports, {
  getDebates: function(electionYear) {
    var deferred = b.defer();
    var debates;

    debates = _.filter(
      _.map(fs.readdirSync(path.join('./', DEBATE_PATH)), function(debateName) {
        if(debateName.indexOf(electionYear-1) > -1 ||
          debateName.indexOf(electionYear) > 1) {

          return fs.readFileSync(path.join('./', DEBATE_PATH, debateName));
        }
      })
    );
    
    if(debates.length) {
      deferred.resolve(debates);
      return deferred.promise;
    }

    debates = _.filter(
      _.map(fs.readdirSync(path.join('./', DEBATE_PATH, 'raw')), function(debateName) {
        if(debateName.indexOf(electionYear-1) > -1 ||
          debateName.indexOf(electionYear) > 1) {

          return processDebateHTML(
            fs.readFileSync(path.join('./', DEBATE_PATH, 'raw', debateName)).toString(),
            debateName
          );
        }
      })
    );

    if(debates.length) {
      b.all(debates).spread(deferred.resolve.bind(deferred));
      return deferred.promise;
    }

    if(!debates.length) {
      makeRequest('http://www.presidency.ucsb.edu/debates.php')
        .then(function($) {
           return b.all(
            _.map(
              $('tr td.docdate').filter(function() {
                var $this = $(this);

                return (
                  this.textContent.indexOf(electionYear-1) > -1 ||
                  this.textContent.indexOf(electionYear) > -1
                );
              })
              .map(_.partial(getDebateLinks, $))
              .get(),
              processDebateHTML
            )
          ).spread(deferred.resolve.bind(deferred));
        });
    }

    return deferred.promise;
  },

  getIssues: function getIssues() {
    return makeRequest('http://www.ontheissues.org/issues.htm')
      .then(function($) {
        return $('body > table > tbody > tr > td:first-child > table td a').map(function() {
          return _.trim(this.textContent);
        }).get();
      }
    );
    
  },

  getCandidateIssues: function getCandidateIssues(candidate) {
    return findIssuesUrl(candidate.website)
            .then(makeRequest)
              .then(_.partialRight(parseIssues, candidate));
  },

  getCandidates: function getCandidates() {
    var parties = ['democrat', 'republican'];

    return b.all([
      makeRequest(WIKI_HOST + 'Democratic_Party_presidential_candidates,_2016')
        .then(function($) {
          return $('table.wikitable.sortable tbody').first().map(function() {
            return $(this).children('tr').map(function() {
              var $cells = $(this).find('td');

              return {
                name: _.trim($cells.first().find('a').last().text()),
                website: $cells.eq($cells.length-2).find('a.external').attr('href')
              };
            }).get();
          }).get();
        }
      ),
      makeRequest(WIKI_HOST + 'Republican_Party_presidential_candidates,_2016')
      .then(function($) {
          return $('table.wikitable.sortable tbody').first().map(function() {
            return $(this).children('tr').map(function() {
              var $cells = $(this).find('td');

              return {
                name: _.trim($cells.first().find('a').last().text()),
                website: $cells.eq($cells.length-2).find('a.external').attr('href')
              };
            }).get();
          }).get();
        }
      )
    ])
    .spread(function() {
      var output = {};
      for(var i in arguments) output[parties[i]] = arguments[i];
      return output;
    });
  }
});

module.exports.getDebates(2016)