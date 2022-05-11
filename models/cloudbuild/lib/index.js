const socketClient = require('socket.io-client');
const log = require('@simple.code/cms-cli-log');

const FAILED_CODE = ['prepare failed', 'download failed', 'install failed', 'build failed', 'pre-publish failed', 'publish failed'];

const CONNECT_TIME_OUT = 5 * 1000;

const parseMessage = (msg) => {
  const action = msg.data.action;
  const message = msg.data.payload.message;
  return {
    action, message,
  };
};

class CloudBuild {
  // TODO
  constructor(git, options) {
    this.git = git;
    this.buildCmd = options.buildCmd;
    this.timeout = 5 * 60 * 1000;
    this.prod = options.prod;
  }

  doTimeout(fn, timeout) {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      fn();
    }, timeout);
  }

  init() {
    return new Promise((resolve, reject) => {
      const socket = socketClient('http://127.0.0.1:7001', {
        query: {
          repo: this.git.remote,
          name: this.git.name,
          branch: this.git.branch,
          version: this.git.version,
          buildCmd: this.buildCmd,
          prod: this.prod,
        },
      });

      socket.on('connect', () => {
        if (this.timer) {
          clearTimeout(this.timer);
        }
        log.success('websocket 连接成功');
        const { id } = socket;
        log.success('云构建任务创建成功', `任务 ID ${id}`);
        socket.on(id, (msg) => {
          const { action, message } = parseMessage(msg);
          log.success(action, message);
        });
        resolve();
      });

      const disconnect = () => {
        clearTimeout(this.timer);
        socket.disconnect();
        socket.close();
      };

      this.doTimeout(() => {
        log.error('云构建服务连接超时，自动终止');
        disconnect();
      }, CONNECT_TIME_OUT);

      socket.on('disconnect', () => {
        log.success('disconnect', '云构建任务断开');
        disconnect();
      });

      socket.on('error', (error) => {
        log.error('error', '云构建出错');
        disconnect();
        reject(error);
      });

      this.socket = socket;
    });
  }

  build() {
    let ret = true;
    return new Promise((resolve, reject) => {
      this.socket.emit('build');
      this.socket.on('build', (msg) => {
        const { action, message } = parseMessage(msg);
        if (FAILED_CODE.indexOf(action) >= 0) {
          log.error(action, message);
          clearTimeout(this.timer);
          this.socket.disconnect();
          this.socket.close();
          ret = false;
        } else {
          log.success(action, message);
        }
      });
      this.socket.on('building', (msg) => {
        console.log(msg);
      });

      this.socket.on('disconnect', () => {
        resolve(ret);
      });
      this.socket.on('error', (err) => {
        reject(err);
      });
    });
  }
}

module.exports = CloudBuild;
