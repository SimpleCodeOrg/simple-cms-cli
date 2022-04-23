/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
const path = require('path');
const { isObject, formatPath } = require('@simple.code/cms-cli-utils');

const pkgDir = require('pkg-dir').sync;

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
  }

  // async exits() {
  //   if (this.storePath) {}
  // }

  // async install() {}

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
    // if (this.storePath) {
    //   return getRootFile(this.cacheFilePath);
    // }
    return getRootFile(this.rootPath);
  }
}

module.exports = Package;
