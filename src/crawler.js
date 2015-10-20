'use strict';

var WIKI_LANG = process.env.WIKI_LANG || 'en';

var _ = require('lodash');
var b = require('bluebird');
var fs = require('fs');
var URL = require('url');
var path = require('path');
var jsdom = require('jsdom');

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

  jsdom.env({
    url: url,
    scripts: [ 'http://code.jquery.com/jquery.js' ],
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

_.extend(module.exports, {
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

module.exports.getCandidates()
  .then(function(parties) {
    var total = _.flatten(parties);
    var completed = 0;

    return b.all(
      _.flatten(
        _.map(parties, function(candidates, party) {
          return _.map(candidates, function(data, i) {
            if(!data.website) return;

            return module.exports.getCandidateIssues(data)
              .then(function(issues) {
                return _.merge(data, {
                  party: party,
                  issues: issues
                });
              }, function() {
                console.log('\x1B[1;31mError finding issues for %s\x1B[0m', data.name);
              })
              .then(_.partial(writeCandidateFile, _.last(data.name.split(' ')).toLowerCase()))
              .then(
                function() {
                  console.log('\x1B[1;32mFinished processing %s\x1B[0m', data.name);
                }, function() {
                  console.log('\x1B[1;31mError processing %s\x1B[0m', data.name);
                }
              );
          });
        })
      )
    );
  }, function() {
    console.log('FAILED!');
  })
  .then(function() {
    console.log('COMPLETE!');
    process.exit(0);
  }, function(err) {
    console.log(err);
    console.log('ERROR!');
    process.exit(0);
  });

// module.exports.getIssues()
//   .then(function(data) {
//     fs.writeFileSync(path.join(__dirname, '../data/issues.json'), JSON.stringify(data, null, 2));
//  });
 