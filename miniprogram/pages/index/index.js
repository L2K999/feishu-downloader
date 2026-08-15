const { feishuApi, cloudDocApi, downloadHistory, downloadFile } = require('../../utils/api.js');
const { parseCloudUrl, getSupportedFormats, SUPPORTED_PLATFORMS } = require('../../utils/util.js');

Page({
  data: {
    inputUrl: '',
    isBatchMode: false,
    batchUrls: [''],
    parsedInfo: null,
    supportedFormats: [],
    selectedFormat: '',
    isProcessing: false,
    processingStatus: '',
    supportedPlatforms: [],
    serverUrlInput: '',
    connectionStatus: '',
    connectionOk: false
  },

  onLoad() {
    var app = getApp();
    this.setData({
      supportedPlatforms: SUPPORTED_PLATFORMS,
      serverUrlInput: app.globalData.serverUrl
    });
  },

  onUrlInput(e) {
    this.setData({
      inputUrl: e.detail.value,
      parsedInfo: null,
      supportedFormats: [],
      selectedFormat: ''
    });
  },

  onBatchUrlInput(e) {
    const index = e.currentTarget.dataset.index;
    const urls = this.data.batchUrls;
    urls[index] = e.detail.value;
    this.setData({ batchUrls: urls });
  },

  toggleBatchMode() {
    this.setData({
      isBatchMode: !this.data.isBatchMode,
      batchUrls: ['']
    });
  },

  addBatchUrl() {
    const urls = this.data.batchUrls;
    urls.push('');
    this.setData({ batchUrls: urls });
  },

  removeBatchUrl(e) {
    const index = e.currentTarget.dataset.index;
    const urls = this.data.batchUrls;
    if (urls.length > 1) {
      urls.splice(index, 1);
      this.setData({ batchUrls: urls });
    }
  },

  async parseUrl() {
    const url = this.data.inputUrl.trim();
    if (!url) {
      wx.showToast({ title: '请输入文档链接', icon: 'none' });
      return;
    }

    const parsed = parseCloudUrl(url);
    if (!parsed.valid) {
      wx.showToast({ title: '无效的云文档链接', icon: 'none' });
      return;
    }

    if (!parsed.supported) {
      wx.showModal({
        title: '暂不支持的平台',
        content: '检测到 ' + parsed.platformLabel + ' 链接，该平台暂未开放下载接口。',
        showCancel: false
      });
      return;
    }

    const formats = getSupportedFormats(parsed.platform, parsed.type);
    this.setData({
      parsedInfo: parsed,
      supportedFormats: formats,
      selectedFormat: formats[0].value
    });
  },

  selectFormat(e) {
    this.setData({
      selectedFormat: e.currentTarget.dataset.format
    });
  },

  async startDownload() {
    if (!this.data.parsedInfo) {
      wx.showToast({ title: '请先解析链接', icon: 'none' });
      return;
    }

    if (!this.data.selectedFormat) {
      wx.showToast({ title: '请选择导出格式', icon: 'none' });
      return;
    }

    this.setData({
      isProcessing: true,
      processingStatus: '正在创建导出任务...'
    });

    try {
      const format = this.data.selectedFormat;
      const platform = this.data.parsedInfo.platform;
      const token = this.data.parsedInfo.token;

      if (platform === 'feishu' && format === 'markdown') {
        await this.handleMarkdownDownload(token, platform);
        return;
      }

      if (['notion', 'yuque', 'google'].includes(platform)) {
        await this.handleDirectDownload(platform, format);
        return;
      }

      await this.handleAsyncDownload(platform, format);
    } catch (err) {
      this.setData({
        isProcessing: false,
        processingStatus: ''
      });
      
      // 检查是否是网络错误
      const errMsg = err.message || '';
      if (errMsg.indexOf('request:fail') >= 0 || errMsg.indexOf('网络') >= 0 || errMsg.indexOf('timeout') >= 0) {
        wx.showModal({
          title: '网络连接失败',
          content: '无法连接到后端服务，请检查：\n1. 手机和电脑是否在同一局域网\n2. 后端服务地址是否正确（app.js 中的 SERVER_URL）\n3. 后端服务是否已启动',
          showCancel: false,
          confirmText: '我知道了'
        });
      } else {
        wx.showToast({
          title: errMsg || '导出失败',
          icon: 'none',
          duration: 3000
        });
      }
    }
  },

  async handleMarkdownDownload(token, platform) {
    this.setData({ processingStatus: '正在获取 Markdown 内容...' });

    const result = await feishuApi.getMarkdownContent(token, platform);
    if (result.code !== 0) {
      throw new Error(result.msg || '获取内容失败');
    }

    const markdownContent = result.data.content;
    const fileName = 'doc_' + token.substring(0, 8) + '.md';

    downloadHistory.addRecord({
      name: fileName,
      format: 'markdown',
      url: this.data.inputUrl,
      status: 'success',
      filePath: '',
      content: markdownContent,
      platform: platform
    });

    this.setData({
      isProcessing: false,
      processingStatus: ''
    });

    wx.showModal({
      title: '下载成功',
      content: 'Markdown 内容已获取，可在历史中查看。是否保存为文件？',
      confirmText: '保存',
      success: (res) => {
        if (res.confirm) {
          this.saveMarkdownToFile(markdownContent, fileName);
        }
      }
    });
  },

  async handleDirectDownload(platform, format) {
    this.setData({ processingStatus: '正在导出' + this.data.parsedInfo.platformLabel + '文档...' });

    const result = await cloudDocApi.exportDocument(this.data.parsedInfo, format);
    if (result.code !== 0) {
      throw new Error(result.msg || '导出失败');
    }

    const data = result.data;
    const token = this.data.parsedInfo.token;

    if (data.content && !data.fileId) {
      const ext = format === 'html' ? 'html' : 'md';
      const fileName = platform + '_' + token.substring(0, 8) + '.' + ext;

      downloadHistory.addRecord({
        name: fileName,
        format: format,
        url: this.data.inputUrl,
        status: 'success',
        filePath: '',
        content: data.content,
        platform: platform
      });

      this.setData({ isProcessing: false, processingStatus: '' });

      wx.showModal({
        title: '下载成功',
        content: this.data.parsedInfo.platformLabel + ' 文档已导出，是否保存为文件？',
        confirmText: '保存',
        success: (res) => {
          if (res.confirm) {
            this.saveMarkdownToFile(data.content, fileName);
          }
        }
      });
      return;
    }

    if (data.downloadUrl || data.fileUrl) {
      const fileUrl = data.downloadUrl || data.fileUrl;

      this.setData({ processingStatus: '正在下载文件...' });

      const downloadResult = await downloadFile(fileUrl);

      if (downloadResult.statusCode === 200) {
        const fileName = data.fileName || platform + '_' + token.substring(0, 8) + '.' + format;

        downloadHistory.addRecord({
          name: fileName,
          format: format,
          url: this.data.inputUrl,
          status: 'success',
          tempFilePath: downloadResult.tempFilePath,
          platform: platform
        });

        this.setData({ isProcessing: false, processingStatus: '' });

        wx.showModal({
          title: '下载成功',
          content: '文件已下载：' + fileName,
          confirmText: '保存',
          success: (res) => {
            if (res.confirm) {
              this.saveFileToLocal(downloadResult.tempFilePath, fileName);
            }
          }
        });
      } else {
        throw new Error('下载文件失败');
      }
    }
  },

  async handleAsyncDownload(platform, format) {
    const token = this.data.parsedInfo.token;

    this.setData({ processingStatus: '正在创建导出任务...' });

    const taskResult = await cloudDocApi.exportDocument(this.data.parsedInfo, format);
    if (taskResult.code !== 0) {
      throw new Error(taskResult.msg || '创建任务失败');
    }

    if (taskResult.data.task_id) {
      const taskId = taskResult.data.task_id;
      this.setData({ processingStatus: '正在导出文档...' });

      let fileUrl = null;
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const status = await feishuApi.getExportResult(taskId, platform);

        if (status.code !== 0) {
          throw new Error(status.msg || '查询状态失败');
        }

        if (status.data.result.job_status === 0) {
          fileUrl = status.data.result.file_url;
          break;
        } else if (status.data.result.job_status === 2) {
          throw new Error('导出任务失败');
        }
        this.setData({ processingStatus: '处理中... (' + (i + 1) + '/30)' });
      }

      if (!fileUrl) {
        throw new Error('导出超时');
      }

      await this.downloadAndSaveFile(fileUrl, platform, format, token);
    } else if (taskResult.data.operationId) {
      const { operationId, fileId } = taskResult.data;
      this.setData({ processingStatus: '正在导出文档...' });

      const api = require('../../utils/api.js');
      let result = null;
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const status = await api.tencentApi.getExportResult(fileId, operationId);

        if (status.code !== 0) {
          throw new Error(status.msg || '查询状态失败');
        }

        if (status.data.status === 'success') {
          result = status.data;
          break;
        } else if (status.data.status === 'failed') {
          throw new Error('导出任务失败');
        }
        this.setData({ processingStatus: '处理中... (' + (i + 1) + '/30)' });
      }

      if (!result) {
        throw new Error('导出超时');
      }

      await this.downloadAndSaveFile(result.downloadUrl, platform, format, token);
    }
  },

  async downloadAndSaveFile(fileUrl, platform, format, token) {
    this.setData({ processingStatus: '正在下载文件...' });

    const downloadResult = await downloadFile(fileUrl);

    if (downloadResult.statusCode === 200) {
      const fileExt = format === 'docx' ? 'docx' : (format === 'pdf' ? 'pdf' : format);
      const fileName = platform + '_' + token.substring(0, 8) + '.' + fileExt;

      downloadHistory.addRecord({
        name: fileName,
        format: format,
        url: this.data.inputUrl,
        status: 'success',
        tempFilePath: downloadResult.tempFilePath,
        platform: platform
      });

      this.setData({
        isProcessing: false,
        processingStatus: ''
      });

      wx.showModal({
        title: '下载成功',
        content: '文件已下载：' + fileName,
        confirmText: '保存',
        success: (res) => {
          if (res.confirm) {
            this.saveFileToLocal(downloadResult.tempFilePath, fileName);
          }
        }
      });
    } else {
      throw new Error('下载文件失败');
    }
  },

  saveMarkdownToFile(content, fileName) {
    const fs = wx.getFileSystemManager();
    const filePath = wx.env.USER_DATA_PATH + '/' + fileName;

    fs.writeFile({
      filePath: filePath,
      data: content,
      encoding: 'utf8',
      success: () => {
        wx.showToast({ title: '已保存', icon: 'success' });
      },
      fail: () => {
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    });
  },

  saveFileToLocal(tempFilePath, fileName) {
    const fs = wx.getFileSystemManager();
    const ext = fileName.split('.').pop();
    const filePath = wx.env.USER_DATA_PATH + '/' + Date.now() + '.' + ext;

    fs.copyFile({
      srcPath: tempFilePath,
      destPath: filePath,
      success: () => {
        wx.showToast({ title: '已保存', icon: 'success' });
      },
      fail: () => {
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    });
  },

  async startBatchDownload() {
    const urls = this.data.batchUrls.filter(function(u) { return u.trim(); });
    if (urls.length === 0) {
      wx.showToast({ title: '请输入至少一个链接', icon: 'none' });
      return;
    }

    this.setData({ isProcessing: true, processingStatus: '正在批量处理...' });

    try {
      const items = [];
      for (const url of urls) {
        const parsed = parseCloudUrl(url.trim());
        if (parsed.valid && parsed.supported) {
          items.push({
            url: url.trim(),
            token: parsed.token,
            type: parsed.type,
            platform: parsed.platform,
            format: 'docx'
          });
        }
      }

      if (items.length === 0) {
        throw new Error('没有有效的链接');
      }

      const result = await feishuApi.batchExport(items);

      if (result.code !== 0) {
        throw new Error(result.msg || '批量导出失败');
      }

      const batchId = result.data.batch_id;

      for (let i = 0; i < 60; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const status = await feishuApi.getBatchResult(batchId);

        if (status.code !== 0) continue;

        const allDone = status.data.results.every(function(r) { return r.status === 'success' || r.status === 'failed'; });
        if (allDone) {
          this.setData({ processingStatus: '下载完成' });
          break;
        }
        this.setData({ processingStatus: '批量处理中... (' + (i + 1) + '/60)' });
      }

      this.setData({
        isProcessing: false,
        processingStatus: ''
      });

      wx.showToast({ title: '批量下载完成', icon: 'success' });
    } catch (err) {
      this.setData({ isProcessing: false, processingStatus: '' });
      wx.showToast({ title: err.message || '批量导出失败', icon: 'none' });
    }
  },

  onServerUrlInput(e) {
    this.setData({ serverUrlInput: e.detail.value });
  },

  saveServerUrl() {
    var url = this.data.serverUrlInput.trim();
    if (!url) {
      wx.showToast({ title: '请输入地址', icon: 'none' });
      return;
    }
    // 去除末尾斜杠
    if (url.charAt(url.length - 1) === '/') {
      url = url.substring(0, url.length - 1);
    }
    wx.setStorageSync('server_url', url);
    var app = getApp();
    app.globalData.serverUrl = url;
    this.setData({ serverUrlInput: url });
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  testConnection() {
    var url = this.data.serverUrlInput.trim();
    if (!url) {
      wx.showToast({ title: '请先输入地址', icon: 'none' });
      return;
    }
    this.setData({ connectionStatus: '测试连接中...', connectionOk: false });
    
    wx.request({
      url: url + '/api/health',
      method: 'GET',
      timeout: 10000,
      success: (res) => {
        if (res.data && res.data.code === 0) {
          this.setData({ 
            connectionStatus: '✓ 连接成功，服务运行正常', 
            connectionOk: true 
          });
        } else {
          this.setData({ 
            connectionStatus: '✗ 服务异常，请检查地址', 
            connectionOk: false 
          });
        }
      },
      fail: () => {
        this.setData({ 
          connectionStatus: '✗ 无法连接，请检查地址是否正确', 
          connectionOk: false 
        });
      }
    });
  },

  openFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    });
  }
});