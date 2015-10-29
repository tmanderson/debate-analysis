'use strict';

var _ = require('lodash');
var moment = require('moment');

_.extend(module.exports, {
  electionIssues: require('./election-issues'),
  candidates: require('./candidates'),
  candidateIssues: require('./candidate-issues'),
  transcripts: require('./transcripts')
});

if(process.argv[1].indexOf('crawler') > -1) {
  var args = process.argv.slice(2);
  var run = [];
  var year;

  if(!args.length) {
    console.log([
      '',
      ' crawler [options] [election year]',
      '',
      ' options',
      '     -t, --transcripts    - Get election year debate transcripts',
      '     -c, --candidates     - Get election year candidate information',
      '     -i, --issues         - Get election year issues'
    ].join('\n'));
  }

  for(var i = 0; i < args.length; i++) {
    switch(args[i]) {
      case '-c': 
      case '--candidates':
        run.push(module.exports.candidates);
      break;
      case '-t':
      case '--transcripts':
        run.push(module.exports.transcripts);
      break;
      case '-i':
      case '--issues':
        run.push(module.exports.electionIssues);
      break;
      case '-ci':
      case '--candidate-issues':
        run.push(module.exports.candidateIssues);
      break;
      default:
        if(!year && !_.isNaN(parseInt(args[i]))) year = args[i];
    }
  }

  if(!year) year = moment().format('YYYY');
  
  _.each(run, function(method) { method(year); });
}