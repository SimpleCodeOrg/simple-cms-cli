const log = require('npmlog');

log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info';
log.heading = 'simple-cms-cli';
log.headingStyle = { fg: 'white', bg: 'black' };

log.addLevel('success', 2000, { fg: 'green', bold: true });

module.exports = log;
