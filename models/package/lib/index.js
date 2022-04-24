/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
const path = require('path');
const { isObject, formatPath, pathExists } = require('@simple.code/cms-cli-utils');
const { getDefaultRegistry, getNpmLatestVersion } = require('@simple.code/cms-cli-npm');
const log = require('@simple.code/cms-cli-log');

const pkgDir = require('pkg-dir').sync;
const npmInstall = require('npminstall');
const fs = require('fs-extra');

class Package {
  constructor(options) {
    if (!options) {
      throw new Error('Package 类的 options 参数不能为空！');
    }
    if (!isObject(options)) {
      throw new Error('Package 类的 options 必须为对象类型');
    }

    this.rootPath = options.rootPath;
    this.storePath = options.storePath;
    this.packageName = options.packageName;
    this.packageVersion = options.packageVersion;

    this.cacheFilePathPrefix = this.packageName.replace('/', '_');
  }

  get cacheFilePath() {
    return this.getSpecificCacheFilePath(this.packageVersion);
  }

  async prepare() {
    if (this.storePath && !pathExists(this.storePath)) {
      fs.mkdirpSync(this.storePath); // 如果目录不存在创建目录
    }

    if (this.packageVersion === 'latest') {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
  }

  getSpecificCacheFilePath(packageVersion) {
    return path.resolve(this.storePath, `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`);
  }

  async exits() {
    if (this.storePath) {
      await this.prepare();
      return pathExists(this.cacheFilePath);
    }
    return pathExists(this.rootPath);
  }

  async install() {
    await npmInstall({
      root: this.rootPath,
      storeDir: this.storePath,
      registry: getDefaultRegistry(),
      pkgs: [
        { name: this.packageName, version: this.packageVersion },
      ],
    });
  }

  async update() {
    await this.prepare();
    const latestPkgVersion = await getNpmLatestVersion(this.packageName);
    const latestFilePath = this.getSpecificCacheFilePath(latestPkgVersion);
    if (!pathExists(latestFilePath)) {
      log.verbose(`update npm package ${this.packageName}`);
      await npmInstall({
        root: this.rootPath,
        storeDir: this.storePath,
        registry: getDefaultRegistry(),
        pkgs: [
          { name: this.packageName, version: latestPkgVersion },
        ],
      });
      this.packageVersion = latestPkgVersion;
    } else {
      this.packageVersion = latestPkgVersion;
    }
  }

  getRootFilePath() {
    function getRootFile(rootPath) {
      const dir = pkgDir(rootPath);
      if (dir) {
        const pkgFile = require(path.resolve(dir, 'package.json'));
        const entryPath = pkgFile.main || pkgFile.lib;

        if (pkgFile && entryPath) {
          return formatPath(path.resolve(dir, entryPath));
        }
        return null;
      }
      return null;
    }
    if (this.storePath) {
      return getRootFile(this.cacheFilePath);
    }
    return getRootFile(this.rootPath);
  }
}

module.exports = Package;
