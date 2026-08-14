// 微信云托管配置
// cloudEnvId: 云环境 ID（在微信开发者工具「云开发」面板创建后获得）
// serviceName: 云托管服务名称（在云托管控制台创建服务时设置）
const CLOUD_ENV_ID = 'cloud-doc-xxxx';     // TODO: 替换为你的云环境 ID
const SERVICE_NAME = 'cloud-doc-server';   // 云托管服务名称

// 备用后端地址（用于本地调试或未开通云托管时）
const FALLBACK_SERVER_URL = 'http://localhost:3000';

App({
  globalData: {
    cloudEnvId: CLOUD_ENV_ID,
    serviceName: SERVICE_NAME,
    serverUrl: FALLBACK_SERVER_URL,
    useCloud: true   // true: 使用云托管; false: 使用 serverUrl 直连
  },
  onLaunch() {
    // 读取用户自定义的备用地址
    var savedUrl = wx.getStorageSync('server_url');
    if (savedUrl) {
      this.globalData.serverUrl = savedUrl;
    }
    // 初始化云能力
    if (this.globalData.useCloud && wx.cloud) {
      wx.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true
      });
    }
  }
})