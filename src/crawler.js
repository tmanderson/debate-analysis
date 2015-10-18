'use strict';

var WIKI_LANG = process.env.WIKI_LANG || 'en';

var _ = require('lodash');
var b = require('bluebird');
var fs = require('fs');
var URL = require('url');
var path = require('path');
var jsdom = require('jsdom');
var wikihost = ['https://' + WIKI_LANG, 'wikipedia', 'org/wiki/'].join('.');
var protocols = { 'https:': require('https'), 'http:': require('http') };

function pageExists(url) {
  var deferred = b.defer();

  protocols[url.protocol].get(URL.format(url), function(res) {
    if(/^(2|3)/.test(res.statusCode)) {
      deferred.resolve(URL.format(url));
    }
    else {
      deferred.reject({ code: res.statusCode });
    }
  });

  return deferred.promise;
}

function findIssuesUrl(website) {
  var url = URL.parse(website);
  var paths = arguments[1] || [ '/issues', '/policy', '/category/issues', '/category/policy', '/on-the-issues', '/positions', '/records' ];

  url.pathname = paths.shift();
  return pageExists(url).then(_.identity, _.partial(findIssuesUrl, website, paths));
}

function makeRequest(url, process) {
  var deferred = b.defer();
  console.log('REQUEST: %s', url);
  jsdom.env({
    url: url,
    scripts: [ 'http://code.jquery.com/jquery.js' ],
    done: function(err, window) {
      if(err) return deferred.reject(err);
      b.all([process(window.$)])
        .then(_.first)
        .then(deferred.resolve.bind(deferred));
    }
  });

  return deferred.promise;
}

function writeCandidateFile(filename, data) {
  fs.writeFileSync(
    path.join(__dirname, '../data/candidates', filename + '.json'),
    JSON.stringify(data)
  );
}

_.extend(module.exports, {
  getIssues: function getIssues() {
    return makeRequest(
      'http://www.ontheissues.org/issues.htm',
      function($) {
        return $('body > table > tbody > tr > td:first-child > table td a').map(function() {
          return _.trim(this.textContent);
        }).get();
      }
    );
    
  },

  getCandidateIssues: function getCandidateIssues(website) {
    var notIssues = /(nav|menu|header|footer|signup|donate|signup|cta|widget|module)/gi;

    return findIssuesUrl(website)
      .then(function(url) {
        return makeRequest(url, function($) {
          
          return {
            issues_url: url,
            issues: $('h1, h2, h3, p strong a, hr + br + p')
              .filter(function() {
                var parent = this;
                
                while(parent && !/body/i.test(parent.tagName)) {
                  if(notIssues.test([parent.tagName, parent.id, parent.className].join(' '))) {
                    return false;
                  }
                  
                  parent = parent.parentNode;
                }

                return true;
              })
              .map(function() {
                return this.textContent;
              }).get()
          };
        });
      });
  },

  getCandidates: function getCandidates() {
    var parties = ['democrat', 'republican'];

    return b.all([
      makeRequest(
        wikihost + 'Democratic_Party_presidential_candidates,_2016',
        function($) {
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
      makeRequest(
        wikihost + 'Republican_Party_presidential_candidates,_2016',
        function($) {
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
  },

  getPositions: function getCandidatePositions() {
    return makeRequest(
      wikihost + 'Political_positions_of_Jeb_Bush',
      function($) {
        return $('h3 > span:first-child').map(function() {
          return _.trim(this.textContent);
        }).get();
      }
    );
  }
});

// module.exports.getCandidateIssues('http://www.chafee2016.com/')
//   .then(function(issues) {
//     console.log(issues);
//   });

module.exports.getCandidates()
  .then(function(parties) {
    _.each(parties, function(candidates, party) {
      _.each(candidates, function(data, i) {

        var shortname = _.last(data.name.split(' '));

        if(data.website) {
          return module.exports.getCandidateIssues(data.website)
            .then(function(issues) {
              writeCandidateFile(shortname.toLowerCase(), {
                ref: shortname.toLowerCase(),
                name: data.name,
                party: party,
                website: data.website,
                url: {
                  website: data.website,
                  issues: issues.issues_url
                },
                positions: _.uniq(_.map(issues.issues, function(v) {
                  return _.trim(v.toLowerCase());
                }))
              });
            });
        }
      });
    });
  });

// module.exports.getIssues()
//   .then(function(data) {
//     fs.writeFileSync(path.join(__dirname, '../data/issues.json'), JSON.stringify(data));
//  });