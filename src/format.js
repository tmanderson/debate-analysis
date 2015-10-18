'use strict';
var _ = require('lodash');

_.extend(module.exports, {
  makeTable: function makeMarkdownTable(headings, data) {
    var output = '';

    var cols = headings.length;
    var colWidths = _.map(headings, function(heading, i) {
      return Math.max(heading.length, _.max(data, function(row) { return row[i].toString().length; })[i].toString().length);
    });
    
    var padding = _.map(_.range(_.max(colWidths)), _.constant(' '));
    var underlines = [ _.map(_.range(colWidths[0]), _.constant('-')).join(''), _.map(_.range(colWidths[1]), _.constant('-')).join('') ];
    var colpad, xtrapad;

    return _.map([headings, underlines ].concat(data), function(row, i) {
      return ' | ' + _.map(row, function(value, j) {
        colpad = padding.slice(0,colWidths[j]/2 - value.toString().length/2).join('');
        xtrapad = padding.slice(0, colWidths[j] - (colpad + colpad + value).length).join('');

        if(!i) return colpad + value + colpad;
        return value + colpad + colpad + xtrapad;
      }).join(' | ') + ' | ';
    }).join('\n');
  }
});