const GitServer = require('./GitServer');
const GithubRequest = require('./GithubRequest');

class Github extends GitServer {
  constructor() {
    super('Github');
    this.request = null;
  }

  getTokenHelpUrl() {
    return 'https://docs.github.com/cn/authentication/connecting-to-github-with-ssh';
  }

  getTokenUrl() {
    return 'https://github.com/settings/tokens';
  }

  getSSHKeysUrl = () => 'https://github.com/settings/keys';

  getSSHKeysHelpUrl = () => 'https://docs.github.com/en/free-pro-team@latest/github/authenticating-to-github/connecting-to-github-with-ssh';

  getUser() {
    return this.request.get('/user');
  }

  getOrgs() {
    return this.request.get('/user/orgs', { page: 1, per_page: 100 });
  }

  setToken(token) {
    super.setToken(token);
    this.request = new GithubRequest(token);
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

  // 创建组织仓库;
  createOrgRepo(name, org) {
    return this.request.post(`/orgs/${org}/repos`, { name });
  }

  getRemote(login, name) {
    return `git@github.com:${login}/${name}.git`;
  }
}

module.exports = Github;

// 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
