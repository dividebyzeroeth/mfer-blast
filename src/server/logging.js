var fs = require('fs');
var getDirName = require('path').dirname;

var log_file = null;

var dir = __dirname + '/logs/';

fs.mkdir(dir, { recursive: true}, function (err) {
  log_file = fs.createWriteStream(dir+Math.floor(0.001*Date.now())+'.log', {flags : 'w'});
});

function log(d) {
  if (!log_file) return;
  log_file.write(d + ',' + Math.floor(0.001*Date.now()) + '\n');
};

module.exports = log;