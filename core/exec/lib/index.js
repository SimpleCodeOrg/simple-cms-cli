const path = require('path');

const { exec: spawn } = require('@simple.code/cms-cli-utils');
const Package = require('@simple.code/cms-cli-package');
const log = require('@simple.code/cms-cli-log');

const CommandConfig = {
  init: '@simple.code/cms-cli-init',
};

const CACHE_DIR = 'dependencies';

async function exec(...argv) {
  let actionPath = process.env.CLI_COMMAND_ACTION_PATH;
  const homePath = process.env.CLI_HOME_PATH;
  let storePath = '';

  const cmdObj = argv[argv.length - 1];
  const cmdName = cmdObj.name();
  const packageName = CommandConfig[cmdName];
  const packageVersion = 'latest';
  let pkg = null;

  if (!actionPath) {
    actionPath = path.resolve(homePath, CACHE_DIR);
    storePath = path.resolve(actionPath, 'node_modules');

    pkg = new Package({
      rootPath: actionPath,
      storePath,
      packageName,
      packageVersion,
    });
    if (await pkg.exits()) {
      // 判断是否要更新
    } else {
      // install package
    }
  } else {
    pkg = new Package({
      rootPath: actionPath,
      storePath: '',
      packageName: '',
      packageVersion: '',
    });
  }

  const rootFile = pkg.getRootFilePath();
  if (rootFile) {
    try {
      const code = `require('${rootFile}').apply(null, ${JSON.stringify(argv.slice(0, argv.length - 1))})`;
      const child = spawn('node', ['-e', code], {
        cwd: process.cwd(),
        stdio: 'inherit',
      });
      child.on('error', (e) => {
        log.error(e.message);
        process.exit(1);
      });
      child.on('exit', (e) => {
        log.verbose(`命令执行成功：${e}`);
        process.exit(e);
      });
      // eslint-disable-next-line import/no-dynamic-require
      // require(rootFile)(...argv);
    } catch (error) {
      log.error(error.message);
    }
  }
}

module.exports = exec;
