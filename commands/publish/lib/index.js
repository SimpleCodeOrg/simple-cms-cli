/* eslint-disable class-methods-use-this */
const path = require('path');
const fs = require('fs-extra');

const Command = require('@simple.code/cms-cli-command');
const log = require('@simple.code/cms-cli-log');
const colors = require('@simple.code/cms-cli-colors');
const Git = require('@simple.code/cms-cli-git');

class PublishCommand extends Command {
  projectInfo = null;

  init() {
    this.options = this.argv[this.argv.length - 1];
  }

  async exec() {
    try {
      const startTime = new Date().getTime();
      await this.prepare();
      const git = new Git(this.projectInfo, this.options);
      await git.prepare();
      git.init();
      const endTime = new Date().getTime();
      log.info('本次发布耗时：', `${Math.floor((endTime - startTime) / 1000)}秒`);
    } catch (error) {
      log.error(error.message);
    }
  }

  async prepare() {
    const projectPath = process.cwd();
    const pkgPath = path.resolve(projectPath, 'package.json');
    log.verbose('package.json:', pkgPath);
    if (!fs.existsSync(pkgPath)) {
      throw new Error('package.json 不存在');
    }
    const pkg = fs.readJSONSync(pkgPath);
    const { name, version, scripts } = pkg;
    if (!name) {
      throw new Error(colors.error('package.json 中的 name 信息不全'));
    }
    if (!version) {
      throw new Error(colors.error('package.json 中的 version 信息不全'));
    }
    if (!scripts || !scripts.build) {
      throw new Error(colors.error('package.json 中的 scripts build 命令不全'));
    }
    this.projectInfo = {
      name, version, dir: projectPath,
    };
  }
}

function publish(...argv) {
  return new PublishCommand(argv);
}

module.exports = publish;
