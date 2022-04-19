const log = require('@simple.code/cms-cli-log');
const colors = require('@simple.code/cms-cli-colors');
const { pathExists } = require('@simple.code/cms-cli-utils');
const { getNpmInfo } = require('@simple.code/cms-cli-npm');

const rootCheck = require('root-check');
const userHome = require('user-home');

const pkg = require('../package.json');

function checkPkgVersion() {
  log.info('当前版本:', pkg.version);
}

function checkRoot() {
  rootCheck();
}

function checkUserHome() {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.error('当前登陆用户的主目录不存在'));
  }
}

async function checkGlobalUpdate() {
  // const currentVersion = pkg.version;
  const npmName = pkg.name;
  const versions = await getNpmInfo(npmName);
  console.log(versions);
}

async function core() {
  try {
    checkPkgVersion();
    checkRoot();
    checkUserHome();
    await checkGlobalUpdate();
  } catch (error) {
    log.error(error.message);
  }
}

module.exports = core;
