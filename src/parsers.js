'use strict';
var _ = require('lodash');

_.extend(module.exports, {
  transcript: function(text) {
    var output = _.trim(text.replace(/[\n\r\t]+/g, '').replace(/\s{2,}/g, ''));
      // escape quotes first
    output = output.replace(/\"/g, '\\"');
      // then quote the keys of all our lines
    output = output.replace(/([A-Z']+)\:/g, '\n"$1":');
    // then quote the responses
    output = _.map(output.split('\n'), function(line, i, lines) {
      return line.replace(/(\"[A-Z']+\"\:)([\w\W]*)$/, '{ $1 "$2" }') + (i && i < lines.length-1 ? ',' : '');
    }).join('\n');
    
    return JSON.parse('[' + output + ']', null, 2);
  }
});