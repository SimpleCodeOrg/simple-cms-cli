const fs = require('fs-extra');
const kebabCase = require('kebab-case');
const semver = require('semver');
const path = require('path');
const glob = require('glob');
const ejs = require('ejs');

const Command = require('@simple.code/cms-cli-command');
const Package = require('@simple.code/cms-cli-package');
const createRequest = require('@simple.code/cms-cli-request');
const log = require('@simple.code/cms-cli-log');
const { checkDirEmpty, spinnerStart, execAsync } = require('@simple.code/cms-cli-utils');

const inquirer = require('inquirer');

const request = createRequest({ baseURL: 'http://localhost:7001' });

class InitCommand extends Command {
  // async prepare() {}
  projectInfo = null;

  templateNpm = null;

  whiteCmd = ['npm', 'cnpm', 'yarn'];

  templateInfo = null;

  init() {
    this.projectName = this.argv[0];
    this.opts = this.argv[1] || {};
  }

  async exec() {
    await this.getTemplateList();
    await this.emptyDir();
    await this.getProjectInfo();
    await this.downloadTemplate();
    await this.installTemplate();
  }

  async getTemplateList() {
    const list = await request.get('/project/getTemplate');
    if (!list || list.length === 0) {
      throw new Error('项目模板不存在');
    }
    this.templateList = list;
  }

  async emptyDir() {
    const localPath = process.cwd();
    const isDirEmpty = checkDirEmpty(localPath, (file) => (
      !file.startsWith('.') && ['node_modules'].indexOf(file) < 0
    ));
    const { force: forceEmpty } = this.opts;
    if (!isDirEmpty) {
      if (!forceEmpty) {
        const { ifContinue } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'ifContinue',
            message: '当前文件夹不为空，是否继续创建项目？',
            default: false,
          },
        ]);
        if (!ifContinue) {
          return;
        }
      }

      const { confirmDelete } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmDelete',
          message: '继续创建将清空当前文件夹下所有内容，是否确认？',
          default: false,
        },
      ]);

      if (!confirmDelete) {
        return;
      }
      fs.emptyDirSync(localPath);
    }
  }

  async getProjectInfo() {
    function validProjectName(v) {
      return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v);
    }

    let projectInfo = {
      projectName: this.projectName,
    };

    const projectNamePrompt = validProjectName(this.projectName) ? [] : [
      {
        type: 'input',
        name: 'projectName',
        message: '请输入项目的名称',
        default: '',
        validate(v) {
          const done = this.async();
          setTimeout(() => {
            if (!validProjectName(v)) {
              done('项目名称格式不正确');
              return;
            }
            done(null, true);
          }, 0);
        },
      },
    ];

    const project = await inquirer.prompt([
      ...projectNamePrompt,
      {
        type: 'input',
        name: 'projectVersion',
        message: '请输入项目的版本号',
        default: '1.0.0',
        validate(v) {
          const done = this.async();
          setTimeout(() => {
            if (!semver.valid(v)) {
              done('请输入合法的版本号');
              return;
            }
            done(null, true);
          }, 0);
        },
        filter(v) {
          if (semver.valid(v)) {
            return semver.valid(v);
          }
          return v;
        },
      },
      {
        type: 'list',
        name: 'projectTemplate',
        message: '请选择项目模板',
        choices: this.templateList.map((item) => ({
          value: item.npmName,
          name: item.name,
        })),
      },
    ]);

    projectInfo = { ...projectInfo, ...project };

    if (projectInfo.projectName) {
      projectInfo.className = kebabCase(projectInfo.projectName).replace(/^-/, '');
    }
    this.projectInfo = projectInfo;
  }

  async downloadTemplate() {
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.templateList.find((item) => item.npmName === projectTemplate);
    const rootPath = path.resolve(process.env.CLI_HOME_PATH, 'template');
    const storePath = path.resolve(process.env.CLI_HOME_PATH, 'template', 'node_modules');
    this.templateInfo = templateInfo;

    const templateNpm = new Package({
      rootPath,
      storePath,
      packageName: templateInfo.npmName,
      packageVersion: templateInfo.version,
    });
    if (!await templateNpm.exits()) {
      const spinner = spinnerStart('正在下载模板...');
      try {
        await templateNpm.install();
      } catch (error) {
        throw new Error(error);
      } finally {
        spinner.stop();
        if (templateNpm.exits()) {
          log.success('模板下载成功');
          this.templateNpm = templateNpm;
        }
      }
    } else {
      const spinner = spinnerStart('正在更新模板...');
      try {
        await templateNpm.update();
      } catch (error) {
        throw new Error(error);
      } finally {
        spinner.stop();
        if (templateNpm.exits()) {
          log.success('模板更新成功');
          this.templateNpm = templateNpm;
        }
      }
    }
  }

  async installTemplate() {
    const spinner = spinnerStart('正在安装模板...');
    try {
      const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template');
      const targetPath = process.cwd();
      fs.ensureDirSync(templatePath);
      fs.ensureDirSync(targetPath);
      fs.copySync(templatePath, targetPath);
    } catch (error) {
      throw new Error(error);
    } finally {
      spinner.stop();
      log.success('模板安装成功');
    }

    await this.ejsRender();
    await this.runInstall();
    await this.runStart();
  }

  async ejsRender() {
    const ignore = ['node_modules/**', 'public/**'];
    return new Promise((resolve, reject) => {
      glob('**', {
        cwd: process.cwd(),
        nodir: true,
        ignore,
      }, (error, files) => {
        if (error) {
          reject(error);
        }
        Promise.all(files.map((file) => {
          const filePath = path.join(process.cwd(), file);
          return new Promise((res, rej) => {
            ejs.renderFile(filePath, {
              className: this.projectInfo.className,
              version: this.projectInfo.projectVersion,
            }, {}, (err, result) => {
              if (err) {
                rej(err);
              } else {
                fs.writeFileSync(filePath, result);
                res(result);
              }
            });
          });
        })).then(() => {
          resolve();
        });
      });
    });
  }

  checkCommand(command) {
    const [cmd, ...args] = command.split(' ');
    if (this.whiteCmd.includes(cmd)) {
      return [cmd, ...args];
    }
    throw new Error(`${command} 非法的命令`);
  }

  async runInstall() {
    log.info('正在安装依赖...');
    const { installCommand } = this.templateInfo;
    if (installCommand) {
      const [cmd, ...args] = this.checkCommand(installCommand);
      const installRes = await execAsync(cmd, args, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      if (installRes !== 0) {
        throw new Error('依赖安装失败！');
      }
    }
  }

  async runStart() {
    log.info('正在启动项目...');
    const { startCommand } = this.templateInfo;
    if (startCommand) {
      const [cmd, ...args] = this.checkCommand(startCommand);
      const startRes = await execAsync(cmd, args, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      if (startRes !== 0) {
        throw new Error('项目启动失败！');
      }
    }
  }
}

function init(...argv) {
  return new InitCommand(argv);
}

module.exports = init;
