const createRequest = require('@simple.code/cms-cli-request');
// const log = require('@simple.code/cms-cli-log');

const request = createRequest({ baseURL: 'https://registry.npmjs.org/vue-cli' });

function getDefaultRegistry(isOriginal = true) {
  return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org';
}

async function getNpmInfo(npmName) {
  if (!npmName) {
    throw new Error('npmName 不能为空！');
  }

  try {
    const data = await request.get(`${getDefaultRegistry()}/${npmName}`);
    if (data) {
      return Object.keys(data.versions);
    }
    return [];
  } catch (error) {
    throw new Error(`获取${npmName}版本信息失败`);
  }
}

module.exports = {
  getNpmInfo,
};
