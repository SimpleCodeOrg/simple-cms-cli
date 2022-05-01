/* eslint-disable no-param-reassign */
const createRequest = require('@simple.code/cms-cli-request');

const request = createRequest({ baseURL: 'https://api.github.com' });

class GithubRequest {
  constructor(token) {
    this.token = token;

    this.createService();
  }

  createService() {
    request.interceptors.request.use((config) => {
      config.headers.Authorization = `token ${this.token}`;
      return config;
    }, (error) => Promise.reject(error));
  }

  get(url, params) {
    return request({
      url,
      params,
      method: 'get',
    });
  }
}

module.exports = GithubRequest;
