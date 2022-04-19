const axios = require('axios');
const { error } = require('../../npm/node_modules/@simple.code/cms-cli-log/lib');

function createRequest(config) {
  const { baseURL, timeout = 5000 } = config || {};
  const request = axios.create({
    baseURL,
    timeout,
  });
  request.interceptors.response.use(
    (response) => {
      if (response.status === 200) {
        return response.data;
      }
      return null;
    },
    () => {
      throw new Error(error.message);
    //   Promise.reject(error);
    },
  );

  return request;
}

module.exports = createRequest;
