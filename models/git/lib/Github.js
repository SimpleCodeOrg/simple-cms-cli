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

  getUser() {
    return this.request.get('/user').catch((e) => {
      console.log(e);
    });
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
}

module.exports = Github;

// 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
