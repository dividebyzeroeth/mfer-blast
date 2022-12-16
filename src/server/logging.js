var fs = require('fs');
var log_file = fs.createWriteStream(__dirname + '/logs/'+Math.floor(0.001*Date.now())+'.log', {flags : 'w'});

function log(d) {
  log_file.write(d + ',' + Math.floor(0.001*Date.now()) + '\n');
};

module.exports = log;