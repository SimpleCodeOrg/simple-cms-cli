const simpleGit = require('simple-git');
const path = require('path');
const userHome = require('user-home');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const terminalLink = require('terminal-link');
const semver = require('semver');

const log = require('@simple.code/cms-cli-log');
const { readFile, writeFile, spinnerStart } = require('@simple.code/cms-cli-utils');
const CloudBuild = require('@simple.code/cms-cli-cloudbuild');

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

const VERSION_RELEASE = 'release';
const VERSION_DEVELOP = 'dev';

class Git {
  constructor(
    { name, version, dir },
    {
      refreshServer = false,
      refreshToken = false,
      refreshOwner = false,
      buildCmd = 'npm run build',
      prod = false,
    } = {},
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
    this.repo = null; // 远程仓库对象
    this.refreshServer = refreshServer;
    this.refreshToken = refreshToken;
    this.refreshOwner = refreshOwner;
    this.branch = null; // 本地开发分支
    this.buildCmd = buildCmd;
    this.prod = prod;
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
            message: '请选择远程仓库组织',
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

  async checkRepo() {
    let repo = await this.gitServer.getRepo(this.login, this.name);
    if (!repo) {
      const spinner = spinnerStart('开始创建远程仓库...');
      try {
        if (this.owner === GIT_OWNER_USER) {
          repo = await this.gitServer.createRepo(this.name);
        } else {
          repo = await this.gitServer.createOrgRepo(this.name, this.login);
        }
      } catch (error) {
        throw new Error('远程仓库创建失败');
      } finally {
        spinner.stop(true);
      }
      if (repo) {
        log.success('远程仓库创建成功');
        this.repo = repo;
      }
    } else {
      log.success('远程仓库信息获取成功');
      this.repo = repo;
    }
  }

  async checkGitignore() {
    const gitIgnore = path.resolve(this.dir, '.gitignore');
    if (!fs.existsSync(gitIgnore)) {
      writeFile(gitIgnore, `.DS_Store
node_modules
/dist


# local env files
.env.local
.env.*.local

# Log files
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Editor directories and files
.idea
.vscode
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?`);
      log.success('自动写入 gitignore 文件');
    }
  }

  async prepare() {
    this.checkHomePath();
    await this.checkGitServer();
    await this.checkGitToken();
    await this.getUserAndOrgs();
    await this.checkGitOwner();
    await this.checkRepo(); // 校验并创建远程仓库
    await this.checkGitignore();
    await this.init();
  }

  async initAndAddRemote() {
    log.notice('执行 git 初始化');
    await this.git.init(this.dir);
    log.notice('添加 git remote');
    const remotes = await this.git.getRemotes();
    log.verbose('git remotes', remotes);
    if (!remotes.find((item) => item.name === 'origin')) {
      await this.git.addRemote('origin', this.remote);
    }
  }

  getRemote() {
    const gitPath = path.resolve(this.dir, GIT_ROOT_DIR);
    this.remote = this.gitServer.getRemote(this.login, this.name);
    if (fs.existsSync(gitPath)) {
      log.success('git 已完成初始化');
      return true;
    }
    return false;
  }

  async initCommit() {
    await this.checkConflicted();
    await this.checkNotCommitted();
    if (await this.checkRemoteMaster()) {
      await this.pullRemoteRepo('master', { '--allow-unrelated-histories': null });
    } else {
      await this.pushRemoteRepo('master');
    }
  }

  // 检查代码冲突
  async checkConflicted() {
    log.notice('代码冲突检查');
    const status = await this.git.status();
    if (status.conflicted.length > 0) {
      throw new Error('当前代码存在冲突，请手动处理并通过');
    }
  }

  async checkNotCommitted() {
    log.notice('检查未提交文件');
    const status = await this.git.status();

    if (status.not_added.length > 0
      || status.created.length > 0
      || status.deleted.length > 0
      || status.modified.length > 0
      || status.renamed.length > 0
    ) {
      log.verbose('status', status);
      await this.git.add(status.not_added);
      await this.git.add(status.created);
      await this.git.add(status.deleted);
      await this.git.add(status.modified);
      await this.git.add(status.renamed);
      let message;
      while (!message) {
        // eslint-disable-next-line no-await-in-loop
        message = (await inquirer.prompt({
          type: 'text',
          name: 'message',
          message: '请输入 commit 信息：',
        })).message;
      }

      await this.git.commit(message);
      log.success('本地 commit 提交成功');
    }
  }

  async checkRemoteMaster() {
    return (await this.git.listRemote(['--refs'])).indexOf('refs/heads/master') >= 0;
  }

  async pushRemoteRepo(branchName) {
    log.notice(`推送代码至${branchName}`);
    await this.git.push('origin', branchName);
    log.success('推送代码成功');
  }

  async pullRemoteRepo(branchName, options) {
    log.notice(`同步远程 ${branchName} 分支代码`);
    await this.git.pull('origin', branchName, options).catch((err) => {
      if (err.message.indexOf('Permission denied (publickey)') >= 0) {
        throw new Error(`请获取本地 ssh publickey 并配置到：${this.gitServer.getSSHKeysUrl()}，配置方法：${this.gitServer.getSSHKeysHelpUrl()}`);
      } else if (err.message.indexOf(`Couldn't find remote ref ${branchName}`) >= 0) {
        log.notice(`获取远程 [${branchName}] 分支失败`);
      } else {
        log.error(err.message);
      }
      log.error('请重新执行 imooc-cli publish，如仍然报错请尝试删除 .git 目录后重试');
      process.exit(0);
    });
  }

  async getCorrectVersion() {
    // 获取远程分支号
    log.info('获取代码分支');
    const remoteBranchList = await this.getRemoteBranchList(VERSION_RELEASE);
    let releaseVersion = null;
    if (remoteBranchList && remoteBranchList.length > 0) {
      releaseVersion = remoteBranchList[0];
    }
    log.verbose('releaseVersion', releaseVersion);
    // 生成本地开发分支
    const devVersion = this.version;
    if (!releaseVersion) {
      this.branch = `${VERSION_DEVELOP}/${devVersion}`;
    } else if (semver.gt(this.version, releaseVersion)) {
      log.info('当前版本大于线上最新版本', `${devVersion} >= ${releaseVersion}`);
      this.branch = `${VERSION_DEVELOP}/${devVersion}`;
    } else {
      log.info('当前线上版本大于本地版本', `${releaseVersion} > ${devVersion}`);
      const incType = (await inquirer.prompt({
        type: 'list',
        choices: [
          { value: 'patch', name: `小版本（${releaseVersion} --> ${semver.inc(releaseVersion, 'patch')}）` },
          { value: 'minor', name: `中版本（${releaseVersion} --> ${semver.inc(releaseVersion, 'minor')}）` },
          { value: 'major', name: `大版本（${releaseVersion} --> ${semver.inc(releaseVersion, 'major')}）` },
        ],
        name: 'incType',
        message: '自动升级版本，请选择升级版本类型',
        default: 'patch',
      })).incType;
      const incVersion = semver.inc(releaseVersion, incType);
      this.branch = `${VERSION_DEVELOP}/${incVersion}`;
      this.version = incVersion;
      console.log(incType);
    }
    log.verbose('本地开发分支:', this.branch);
    this.syncVersionToPackageJson();
  }

  async getRemoteBranchList(type) {
    const remoteList = await this.git.listRemote(['--refs']);
    let reg;
    if (type === VERSION_RELEASE) {
      reg = /.+?refs\/tags\/release\/(\d+\.\d+\.\d+)/g;
    } else {
      reg = /.+?refs\/heads\/dev\/(\d+\.\d+\.\d+)/g;
    }

    return remoteList.split('\n').map((remote) => {
      const match = reg.exec(remote);
      reg.lastIndex = 0;
      if (match && semver.valid(match[1])) {
        return match[1];
      }
      return null;
    }).filter((_) => _).sort((a, b) => {
      if (semver.lte(b, a)) {
        if (a === b) return 0;
        return -1;
      }
      return 1;
    });
  }

  async syncVersionToPackageJson() {
    const pkg = fs.readJSONSync(`${this.dir}/package.json`);
    if (pkg && pkg.version !== this.version) {
      pkg.version = this.version;
      fs.writeJSONSync(`${this.dir}/package.json`, pkg, { spaces: 2 });
    }
  }

  async checkStash() {
    log.info('检查 stash 记录');
    const stashList = await this.git.stashList();
    if (stashList.all.length > 0) {
      await this.git.stash(['pop']);
      log.success('stash pop 成功');
    }
  }

  async checkoutBranch(branch) {
    log.info('切换分支');
    const localBranchList = await this.git.branchLocal();
    if (localBranchList.all.indexOf(branch) >= 0) {
      await this.git.checkout(branch);
    } else {
      await this.git.checkoutLocalBranch(branch);
    }
    log.success(`分支切换到 ${branch}`);
  }

  async pullRemoteMasterAndBranch() {
    log.info(`合并 master --> [${this.branch}]`);
    await this.pullRemoteRepo('master');
    log.info('合并远程 master 分支代码成功');
    await this.checkConflicted();
    log.info('检查远程开发分支');
    const remoteBranchList = await this.getRemoteBranchList(VERSION_DEVELOP);
    if (remoteBranchList.indexOf(this.version) >= 0) {
      log.info(`合并 [${this.branch}] --> [${this.branch}]`);
      await this.pullRemoteRepo(this.branch);
      log.success(`合并远程 [${this.branch}]  分支代码成功`);
      await this.checkConflicted();
    } else {
      log.success(`不存在远程分支 [${this.branch}]`);
    }
  }

  getPackageJson() {
    const pkgPath = path.resolve(this.dir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      throw new Error(`package.json 目录不存在， 源码目录 ${this.dir}`);
    }
    return fs.readJSONSync(pkgPath);
  }

  async preparePublish() {
    log.info('开始进行云构建前代码检查');
    const pkg = this.getPackageJson();
    const buildCmdArray = this.buildCmd.split(' ');
    if (buildCmdArray[0] !== 'npm') {
      throw new Error('Build 命令非法，必须使用 npm');
    }
    const lastCmd = buildCmdArray[buildCmdArray.length - 1];
    if (!pkg.scripts || !Object.keys(pkg.scripts).includes(lastCmd)) {
      throw new Error(`${this.buildCmd} 命令不存在`);
    }
  }

  async checkTag() {
    log.info('获取远程 tag 列表');
    const tag = `${VERSION_RELEASE}/${this.version}`;
    const tagList = await this.getRemoteBranchList(VERSION_RELEASE);
    if (tagList.includes(this.version)) {
      log.info(`远程 tag 已存在 ${tag}`);
      await this.git.push(['origin', `:refs/tags/${tag}`]);
      log.info(`远程 tag 已删除 ${tag}`);
    }
    const localTagList = await this.git.tags();
    if (localTagList.all.includes(tag)) {
      log.info(`本地 tag 已存在 ${tag}`);
      await this.git.push(['-d', tag]);
      log.info(`本地 tag 已删除 ${tag}`);
    }
    await this.git.addTag(tag);
    log.info(`本地 tag 创建成功 ${tag}`);
    await this.git.pushTags('origin');
    log.success(`远程 tag 推送成功 ${tag}`);
  }

  async mergeBranchToMaster() {
    log.info('开始合并代码', `[${this.branch}] -> [master]`);
    await this.git.mergeFromTo(this.branch, 'master');
    log.success(`代码合并成功 [${this.branch}] -> [master]`);
  }

  async deleteLocalBranch() {
    log.info('开始删除本地分支', this.branch);
    await this.git.deleteLocalBranch(this.branch);
    log.info('删除本地分支成功', this.branch);
  }

  async deleteRemoteBranch() {
    log.info('开始删除远程分支', this.branch);
    await this.git.push(['origin', '--delete', this.branch]);
    log.info('删除远程分支成功', this.branch);
  }

  async init() {
    if (await this.getRemote()) {
      return;
    }
    await this.initAndAddRemote();
    await this.initCommit();
    // console.log(this);
  }

  async commit() {
    // 生成开发分支
    await this.getCorrectVersion();
    // 检查 stash 区 git stash show // git checkout -- filename 还原文件修改
    await this.checkStash();
    // 检查代码冲突
    await this.checkConflicted();

    await this.checkNotCommitted();

    // 切换开发分支
    await this.checkoutBranch(this.branch);
    // 合并远程 master 分支 和 开发分支
    await this.pullRemoteMasterAndBranch();
    // 推送开发分支到远程仓库
    await this.pushRemoteRepo(this.branch);
  }

  async publish() {
    await this.preparePublish();
    const cloudBuild = new CloudBuild(this, {
      buildCmd: this.buildCmd,
      prod: this.prod,
    });
    await cloudBuild.init();
    await cloudBuild.build();
    console.log(this.prod);
    if (this.prod) {
      await this.checkTag();
      await this.checkoutBranch('master');
      await this.mergeBranchToMaster();
      await this.pushRemoteRepo('master');
    }
  }
}

module.exports = Git;
