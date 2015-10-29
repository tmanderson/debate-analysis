'use strict';

var _ = require('lodash');
var b = require('bluebird');
var URL = require('url');
var jsdom = require('jsdom');

var PROTOCOLS = { 'https:': require('https'), 'http:': require('http') };

_.extend(module.exports, {
  request: function(url) {
    var deferred = b.defer();

    if(!url) {
      deferred.reject('Invalid URL');
      return deferred.promise;
    }
    console.log(url);
    jsdom.env(url, ['http://code.jquery.com/jquery.js'], {
      done: function(err, window) {
        if(err) return deferred.reject(err);
        deferred.resolve(window.$);
      }
    });

    return deferred.promise;
  },

  pageExists: function pageExists(url) {
    var deferred = b.defer();

    PROTOCOLS[url.protocol].get(
      URL.format(url),
      function(res) {
        if(/^(2|3)/.test(res.statusCode)) {
          deferred.resolve(URL.format(url));
        }
        else {
          deferred.reject({ code: res.statusCode });
        }
      }
    );

    return deferred.promise;
  }
});