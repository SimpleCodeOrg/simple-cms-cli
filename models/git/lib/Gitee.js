const GitServer = require('./GitServer');
const GiteeRequest = require('./GiteeRequest');

class Gitee extends GitServer {
  constructor() {
    super('Gitee');
    this.request = null;
  }

  getTokenHelpUrl() {
    return 'https://gitee.com/help/articles/4191';
  }

  getTokenUrl() {
    return 'https://gitee.com/profile/personal_access_tokens';
  }

  setToken(token) {
    super.setToken(token);
    this.request = new GiteeRequest(token);
  }

  getUser() {
    return this.request.get('/user');
  }

  getOrgs() {
    return this.request.get('/user/orgs', { page: 1, per_page: 100, admin: false });
  }

  getRepo(login, name) {
    return this.request.get(`/repos/${login}/${name}`)
      .catch((res) => {
        if (res.response.status === 404) {
          return null;
        }
        return Promise.reject(res);
      });
  }

  // 创建个人仓库
  createRepo(name) {
    return this.request.post('/user/repos', { name });
  }

  // 获取组织的某个仓库
  getOrgRepo(org) {
    return this.request.get(`/orgs/${org}/repos`)
      .catch((res) => {
        if (res.response.status === 404) {
          return null;
        }
        return Promise.reject(res);
      });
  }

  // 创建组织仓库
  createOrgRepo() {}
}

module.exports = Gitee;

// 8f3455e6cc078cbd06206d2940c8d4a2
