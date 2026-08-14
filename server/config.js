const config = {
  feishu: {
    appId: process.env.FEISHU_APP_ID || '',
    appSecret: process.env.FEISHU_APP_SECRET || '',
    baseUrl: 'https://open.feishu.cn/open-apis',
    tokenCache: null,
    tokenExpireTime: 0
  },
  dingtalk: {
    appId: process.env.DINGTALK_APP_ID || '',
    appSecret: process.env.DINGTALK_APP_SECRET || '',
    baseUrl: 'https://oapi.dingtalk.com',
    tokenCache: null,
    tokenExpireTime: 0
  },
  notion: {
    apiKey: process.env.NOTION_API_KEY || '',
    baseUrl: 'https://api.notion.com/v1',
    notionVersion: '2022-06-28'
  },
  yuque: {
    authToken: process.env.YUQUE_AUTH_TOKEN || '',
    csrfToken: process.env.YUQUE_CSRF_TOKEN || '',
    baseUrl: 'https://www.yuque.com/api/v2'
  },
  tencent: {
    appId: process.env.TENCENT_DOC_APP_ID || '',
    appSecret: process.env.TENCENT_DOC_APP_SECRET || '',
    baseUrl: 'https://docs.qq.com/openapi/drive/v2',
    tokenCache: null,
    tokenExpireTime: 0
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY || '',
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    baseUrl: 'https://docs.google.com'
  },
  download: {
    dir: require('path').join(__dirname, 'downloads'),
    maxFileSize: 100 * 1024 * 1024,
    taskTimeout: 60000,
    pollInterval: 2000
  }
};

module.exports = config;
