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
    return this.request.get('/user');
  }

  getOrgs() {
    return this.request.get('/user/orgs', { page: 1, per_page: 100 });
  }

  setToken(token) {
    super.setToken(token);
    this.request = new GithubRequest(token);
  }
}

module.exports = Github;

// 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
