const axios = require('axios');

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
    (error) => Promise.reject(error),
  );

  return request;
}

module.exports = createRequest;
