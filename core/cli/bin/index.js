#!/usr/bin/env node

const importLocal = require('import-local');
const log = require('@simple.code/cms-cli-log');
const cli = require('../lib');

if (importLocal(__filename)) {
  log.info('cli', '正在使用 simple-csm-cli 本地版本');
} else {
  cli();
}
