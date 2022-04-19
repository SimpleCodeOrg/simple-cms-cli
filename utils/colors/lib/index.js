const colors = require('colors/safe');

// black
// red          brightRed
// green        brightGreen
// yellow       brightYellow
// blue         brightBlue
// magenta      brightMagenta
// cyan         brightCyan
// white        brightWhite
// gray
// grey

// reset
// bold
// dim
// italic
// underline
// inverse
// hidden
// strikethrough

colors.setTheme({
  info: 'green',
  warn: 'yellow',
  error: 'red',
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  data: 'grey',
  help: 'cyan',
  debug: 'blue',
  custom: ['red', 'underline'],
});

module.exports = colors;
