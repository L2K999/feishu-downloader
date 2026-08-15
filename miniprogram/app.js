// 后端服务地址（部署到 Render 后替换为实际地址）
// 格式：https://你的服务名.onrender.com
const DEFAULT_SERVER_URL = 'https://cloud-doc-downloader.onrender.com';

App({
  globalData: {
    serverUrl: DEFAULT_SERVER_URL,
    useCloud: false  // Render 直连模式
  },
  onLaunch() {
    // 读取用户自定义的服务地址（优先级高于默认值）
    var savedUrl = wx.getStorageSync('server_url');
    if (savedUrl) {
      this.globalData.serverUrl = savedUrl;
    }
  }
})