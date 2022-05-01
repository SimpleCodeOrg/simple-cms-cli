const simpleGit = require('simple-git');
const path = require('path');
const userHome = require('user-home');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const terminalLink = require('terminal-link');

const log = require('@simple.code/cms-cli-log');
const { readFile, writeFile } = require('@simple.code/cms-cli-utils');

const Github = require('./Github');
const Gitee = require('./Gitee');

const DEFAULT_CLI_HOME = '.simple-cms-cli';
const GIT_ROOT_DIR = '.git';
const GIT_SERVER_FILE = '.git_server';
const GIT_TOKEN_FILE = '.git_token';
const GIT_OWN_FILE = '.git_own';
const GIT_LOGIN_FILE = '.git_login';

const GIT_OWNER_USER = 'user';
const GIT_OWNER_ORG = 'org';

class Git {
  constructor(
    { name, version, dir },
    { refreshServer = false, refreshToken = false, refreshOwner = false } = {},
  ) {
    this.name = name;
    this.version = version;
    this.dir = dir;
    this.git = simpleGit(dir);
    this.gitServer = null;
    this.homePath = null;
    this.token = null;
    this.user = null;
    this.orgs = null;
    this.login = null; // 远程仓库登录名
    this.owner = null; // 远程仓库类型 个人/组织
    this.refreshServer = refreshServer;
    this.refreshToken = refreshToken;
    this.refreshOwner = refreshOwner;
  }

  checkHomePath() {
    if (!this.homePath) {
      if (process.env.CLI_HOME_PATH) {
        this.homePath = process.env.CLI_HOME_PATH;
      } else {
        this.homePath = path.resolve(userHome, DEFAULT_CLI_HOME);
      }
    }
    fs.ensureDirSync(this.homePath);
    if (!fs.existsSync(this.homePath)) {
      throw new Error('用户主目录获取失败！');
    }
    log.verbose('home', this.homePath);
  }

  createPath(file) {
    const rootDir = path.resolve(this.homePath, GIT_ROOT_DIR);
    const filePath = path.resolve(rootDir, file);
    fs.ensureDirSync(rootDir);
    return filePath;
  }

  createGitServer(gitServer) {
    if (gitServer === 'Github') {
      return new Github();
    }
    if (gitServer === 'Gitee') {
      return new Gitee();
    }
    throw new Error(`gitServer 初始化失败: unKnow gitServer: ${gitServer}`);
  }

  async checkGitToken() {
    const tokenPath = this.createPath(GIT_TOKEN_FILE);
    let token = readFile(tokenPath);
    if (!token || this.refreshToken) {
      log.warn(`${this.gitServer.type} token 未生成, 请先生成 ${this.gitServer.type} token ${terminalLink('链接：', this.gitServer.getTokenUrl())}`);
      token = (await inquirer.prompt([
        {
          type: 'password',
          name: 'token',
          default: '',
          message: '请将 token 复制到这里',
        },
      ])).token;
      writeFile(tokenPath, token);
      log.verbose('token 写入成功');
    } else {
      log.verbose('token 读取成功');
    }
    this.token = token;
    this.gitServer.setToken(token);
  }

  async checkGitServer() {
    const gitServerPath = this.createPath(GIT_SERVER_FILE);
    let gitServer = readFile(gitServerPath);
    if (!gitServer || this.refreshServer) {
      gitServer = (await inquirer.prompt([{
        type: 'list',
        name: 'gitServer',
        message: '请选择您要托管的 Git 平台',
        default: 'Github',
        choices: [{ name: 'Github', value: 'Github' }, { name: 'Gitee', value: 'Gitee' }],
      }])).gitServer;
      writeFile(gitServerPath, gitServer);
      log.verbose('gitServer 写入成功', `${gitServer} -----> ${gitServerPath}`);
    } else {
      log.verbose('gitServer 读取成功', gitServer);
    }
    this.gitServer = this.createGitServer(gitServer);
  }

  async getUserAndOrgs() {
    this.user = await this.gitServer.getUser();
    if (!this.user) {
      throw new Error('用户信息获取失败');
    }
    this.orgs = await this.gitServer.getOrgs();
    if (!this.orgs) {
      throw new Error('组织信息获取失败');
    }
  }

  async checkGitOwner() {
    const ownerPath = this.createPath(GIT_OWN_FILE);
    const loginPath = this.createPath(GIT_LOGIN_FILE);
    let owner = readFile(ownerPath);
    let login = readFile(loginPath);
    if (!owner || !login || this.refreshOwner) {
      if (this.orgs.length === 0) {
        owner = GIT_OWNER_USER;
      } else {
        owner = (await inquirer.prompt([
          {
            type: 'list',
            name: 'owner',
            default: GIT_OWNER_USER,
            message: '请选择远程仓库类型',
            choices: [{ value: GIT_OWNER_USER, name: '个人' }, { value: GIT_OWNER_ORG, name: '组织' }],
          },
        ])).owner;
      }

      if (owner === GIT_OWNER_USER) {
        login = this.user.login;
      } else {
        login = (await inquirer.prompt([
          {
            type: 'list',
            name: 'login',
            default: '',
            message: '请选择远程仓库类型',
            choices: this.orgs.map((item) => ({ name: item.description, value: item.login })),
          },
        ])).login;
      }
      writeFile(loginPath, login);
      writeFile(ownerPath, owner);
      log.verbose('owner 写入成功', `${owner} -----> ${ownerPath}`);
      log.verbose('login 写入成功', `${login} -----> ${loginPath}`);
    } else {
      log.verbose('owner 获取成功', `${owner}`);
      log.verbose('login 获取成功', `${login}`);
    }
    this.login = login;
    this.owner = owner;
  }

  async prepare() {
    this.checkHomePath();
    await this.checkGitServer();
    await this.checkGitToken();
    await this.getUserAndOrgs();
    await this.checkGitOwner();
  }

  init() {
    // console.log(this);
  }
}

module.exports = Git;
