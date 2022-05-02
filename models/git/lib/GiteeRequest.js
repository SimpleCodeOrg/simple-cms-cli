const createRequest = require('@simple.code/cms-cli-request');

const request = createRequest({ baseURL: 'https://gitee.com/api/v5' });

class GiteeRequest {
  constructor(token) {
    this.token = token;
  }

  get(url, params) {
    return request({
      url,
      params: {
        ...params,
        access_token: this.token,
      },
      method: 'get',
    });
  }

  post(url, data) {
    return request({
      url,
      data: {
        ...data,
        access_token: this.token,
      },
      method: 'post',
    });
  }
}

module.exports = GiteeRequest;
