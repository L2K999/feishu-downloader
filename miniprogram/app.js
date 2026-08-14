// 后端服务地址配置
// 部署到 Render.com 后，将此地址改为你的 Render 服务地址
// 例如: const DEFAULT_SERVER_URL = 'https://cloud-doc-downloader.onrender.com';
const DEFAULT_SERVER_URL = 'https://cloud-doc-downloader.onrender.com';

App({
  globalData: {
    serverUrl: DEFAULT_SERVER_URL,
    debugMode: false
  },
  onLaunch() {
    // 从本地存储读取用户自定义的服务地址
    var savedUrl = wx.getStorageSync('server_url');
    if (savedUrl) {
      this.globalData.serverUrl = savedUrl;
    }
  }
})