const path = require('path');
const childProcess = require('child_process');

const pathExists = require('path-exists').sync;

function isObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]';
}

function formatPath(p) {
  if (p && typeof p === 'string') {
    const { sep } = path; // 路径分隔符 mac / window \
    if (sep) {
      return p;
    }
    return p.replace(/\\/g, '/');
  }
  return null;
}

function exec(command, args, options) {
  const win32 = process.platform === 'win32';
  const cmd = win32 ? 'cmd' : command;
  const cmdArgs = win32 ? ['/c'].concat(command, args) : args;

  return childProcess.spawn(cmd, cmdArgs, options || []);
}

function execAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    const p = exec(command, args, options);
    p.on('error', (e) => {
      reject(e);
    });
    p.on('exit', (c) => {
      resolve(c);
    });
  });
}

module.exports = {
  isObject,
  pathExists,
  formatPath,
  execAsync,
  exec,
};
