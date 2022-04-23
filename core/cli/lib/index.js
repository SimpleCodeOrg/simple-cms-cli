const log = require('@simple.code/cms-cli-log');
const colors = require('@simple.code/cms-cli-colors');
const { pathExists } = require('@simple.code/cms-cli-utils');
const { getSemverLatestVersion } = require('@simple.code/cms-cli-npm');
const exec = require('@simple.code/cms-cli-exec');

const path = require('path');
const rootCheck = require('root-check');
const userHome = require('user-home');
const dotenv = require('dotenv');
const commander = require('commander');

const pkg = require('../package.json');
const constants = require('./const');

const program = new commander.Command();

function checkPkgVersion() {
  log.success('欢迎使用 simple-cms-cli～');
}

function checkRoot() {
  rootCheck();
}

function checkUserHome() {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.error('当前登陆用户的主目录不存在'));
  }
}

// 读取环境变量
function checkEnv() {
  const dotenvPath = path.resolve(userHome, '.env');
  if (pathExists(dotenvPath)) {
    dotenv.config({
      path: dotenvPath,
    });
  }
}

/**
 * 校验 CLI_HOME_PATH
 */
function checkHomePath() {
  // 用户通过 SIMPLE_CMS_CLI_HOME=xxx 改变
  if (!process.env.SIMPLE_CMS_CLI_HOME) {
    process.env.SIMPLE_CMS_CLI_HOME = constants.DEFAULT_CLI_HOME;
  }
  process.env.CLI_HOME_PATH = path.join(userHome, process.env.SIMPLE_CMS_CLI_HOME);
}

async function checkGlobalUpdate() {
  const currentVersion = pkg.version || '0.0.0';
  const npmName = pkg.name;
  const gtLatestVersion = await getSemverLatestVersion(npmName, currentVersion);
  if (gtLatestVersion) {
    log.warn(`请手动更新 ${npmName}， 当前版本号：${currentVersion}，最新版本号：${gtLatestVersion}`);
    log.info('执行 npm install -g @simple.code/cms-cli 更新');
    throw new Error();
  }
}

function registerCommand() {
  program
    .name('simple-cms-cli')
    .usage('<command> [options]')
    .version(pkg.version)
    .option('-d, --debug', '是否开始调试模式', false)
    .option('-ap, --actionPath <actionPath>', '是否指定本地调试文件路径', '');

  program
    .command('init [projectName]')
    .option('-f, --force', '是否强制初始化项目')
    .option('-t, --test', '是否强制初始化项目')
    .action(exec);

  // 开启debug
  program.on('option:debug', () => {
    if (program.opts().debug) {
      process.env.LOG_LEVEL = 'verbose';
    } else {
      process.env.LOG_LEVEL = 'info';
    }
    log.level = process.env.LOG_LEVEL;
  });

  // 监听 actionPath
  program.on('option:actionPath', () => {
    const { actionPath } = program.opts() || {};
    process.env.CLI_COMMAND_ACTION_PATH = actionPath;
  });

  program.parse(process.argv);
}

async function core() {
  try {
    checkPkgVersion();
    checkRoot();
    checkUserHome();
    checkEnv();
    checkHomePath();
    await checkGlobalUpdate();
    registerCommand();
  } catch (error) {
    log.error(error.message);
  }
}

module.exports = core;
