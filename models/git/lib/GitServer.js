function error(methodName) {
  throw new Error(`${methodName} mast be implemented`);
}

class GitServer {
  token = null;

  type = null;

  constructor(type, token) {
    this.type = type;
    this.token = token;
  }

  setToken(token) {
    this.token = token;
  }

  createRepo() {
    error('createRepo');
  }

  createOrgRepo() {
    error('createOrgRepo');
  }

  getRemote() {
    error('getRemote');
  }

  getUser() {
    error('getUser');
  }

  getOrgs() {
    error('getOrgs');
  }

  getTokenHelpUrl() {
    error('getTokenHelpUrl');
  }

  getTokenUrl() {
    error('getTokenUrl');
  }

  getRepo() {
    error('getRepo');
  }

  getSSHKeysUrl() {
    error('getSSHKeysUrl');
  }

  getSSHKeysHelpUrl() {
    error('getSSHKeysHelpUrl');
  }
}

module.exports = GitServer;
