const createRequest = require('@simple.code/cms-cli-request');
const semver = require('semver');
// const log = require('@simple.code/cms-cli-log');

const request = createRequest({ baseURL: 'https://registry.npmjs.org/vue-cli' });

function getDefaultRegistry(isOriginal = false) {
  return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org';
}

/**
 * 获取 npm 包的信息
 * @param {*} npmName
 * @returns
 */
async function getNpmInfo(npmName, registry) {
  if (!npmName) {
    throw new Error('npmName 不能为空！');
  }

  try {
    const data = await request.get(`${getDefaultRegistry(registry)}/${npmName}`);
    if (data) {
      return data;
    }
    return null;
  } catch (error) {
    const { response = {} } = error;
    if (response.status === 404) {
      throw new Error(`${npmName} 包不存在`);
    }
    throw new Error(`获取${npmName}版本信息失败`);
  }
}

/**
 * 获取 npm 包 version list
 * @returns
 */
async function getNpmVersionList(npmName, registry) {
  const data = await getNpmInfo(npmName, registry);
  if (data) {
    return Object.keys(data.versions);
  }
  return [];
}

/**
 * 获取满足条件的版本号
 */
async function getSemverSatisfiesVersions(versions, satisfies) {
  return versions
    .filter((version) => semver.satisfies(version, satisfies))
    .sort((a, b) => (semver.gt(b, a) ? 1 : -1));
}

/**
 * 判断是否为最新版本
 * @param {*} npmName
 * @param {*} baseVersion
 * @returns
 */
async function getSemverLatestVersion(npmName, baseVersion) {
  const versions = await getNpmVersionList(npmName);
  const gtVersions = await getSemverSatisfiesVersions(versions, `>${baseVersion}`);
  return gtVersions[0] || '';
}

async function getNpmLatestVersion(npmName, registry) {
  let versions = await getNpmVersionList(npmName, registry);
  if (versions) {
    versions = versions.sort((a, b) => (semver.gt(b, a) ? 1 : -1));
    return versions[0];
  }
  return null;
}

module.exports = {
  getDefaultRegistry,
  getNpmInfo,
  getNpmVersionList,
  getSemverSatisfiesVersions,
  getSemverLatestVersion,
  getNpmLatestVersion,
};
