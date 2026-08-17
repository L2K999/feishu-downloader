// 微信云环境 ID（在微信开发者工具「云开发」面板创建后获得）
// TODO: 替换为你实际的云环境 ID，例如 cloud-doc-0gxxxxxx
const CLOUD_ENV_ID = 'cloud-doc-xxxx';

App({
  globalData: {
    cloudEnvId: CLOUD_ENV_ID,
    // 备用地址：云托管失败时降级使用
    serverUrl: 'http://localhost:3000'
  },
  onLaunch() {
    // 读取用户自定义的备用地址
    var savedUrl = wx.getStorageSync('server_url');
    if (savedUrl) {
      this.globalData.serverUrl = savedUrl;
    }
    // 初始化云能力
    if (wx.cloud) {
      wx.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true
      });
    }
  }
})