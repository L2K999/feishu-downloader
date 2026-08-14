// 统一请求封装：优先使用微信云托管，备选 wx.request 直连后端
const request = (options) => {
  return new Promise((resolve, reject) => {
    var app = getApp();
    var useCloud = app && app.globalData && app.globalData.useCloud;
    var path = options.url; // 例如 /api/feishu/parse
    var method = options.method || 'GET';
    var data = options.data || {};

    var doFail = function (err) {
      wx.showToast({
        title: '网络请求失败',
        icon: 'none'
      });
      reject(err);
    };

    var doSuccess = function (res) {
      if (res.statusCode === 200 || res.data) {
        resolve(res.data);
      } else {
        reject(res.data);
      }
    };

    if (useCloud && wx.cloud && wx.cloud.callContainer) {
      // 使用微信云托管调用容器服务
      wx.cloud.callContainer({
        config: { env: app.globalData.cloudEnvId },
        path: path,
        method: method,
        data: data,
        header: {
          'content-type': 'application/json',
          'X-Platform': options.platform || 'feishu'
        },
        success: function (res) {
          // callContainer 返回结构兼容
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(res.data);
          }
        },
        fail: function (err) {
          // 云托管失败时，自动降级到 wx.request
          var serverUrl = app.globalData.serverUrl;
          wx.request({
            url: serverUrl + path,
            method: method,
            data: data,
            header: {
              'content-type': 'application/json',
              'X-Platform': options.platform || 'feishu'
            },
            success: doSuccess,
            fail: doFail
          });
        }
      });
    } else {
      // 直接请求后端地址
      var serverUrl = (app && app.globalData && app.globalData.serverUrl) || 'http://localhost:3000';
      wx.request({
        url: serverUrl + path,
        method: method,
        data: data,
        header: {
          'content-type': 'application/json',
          'X-Platform': options.platform || 'feishu'
        },
        success: doSuccess,
        fail: doFail
      });
    }
  });
};

const feishuApi = {
  parseUrl(url) {
    return request({
      url: '/api/feishu/parse',
      method: 'POST',
      data: { url }
    });
  },

  createExportTask(token, type, format, platform = 'feishu') {
    return request({
      url: '/api/feishu/export',
      method: 'POST',
      data: { token, type, format, platform },
      platform
    });
  },

  getExportResult(taskId, platform = 'feishu') {
    return request({
      url: '/api/feishu/export/result/' + taskId,
      method: 'GET',
      platform
    });
  },

  getMarkdownContent(token, platform = 'feishu') {
    return request({
      url: '/api/feishu/markdown/' + token,
      method: 'GET',
      platform
    });
  },

  batchExport(items) {
    return request({
      url: '/api/feishu/batch-export',
      method: 'POST',
      data: { items }
    });
  },

  getBatchResult(batchId) {
    return request({
      url: '/api/feishu/batch-result/' + batchId,
      method: 'GET'
    });
  },

  downloadFile(fileId, platform = 'feishu') {
    return request({
      url: '/api/feishu/download/' + fileId,
      method: 'GET',
      platform
    });
  }
};

// ==================== Notion API ====================
const notionApi = {
  exportDocument(pageId, format) {
    return request({
      url: '/api/notion/export',
      method: 'POST',
      data: { pageId, format }
    });
  },

  getMarkdown(pageId) {
    return request({
      url: '/api/notion/markdown/' + pageId,
      method: 'GET'
    });
  }
};

// ==================== 语雀 API ====================
const yuqueApi = {
  exportDocument(namespace, slug, format) {
    return request({
      url: '/api/yuque/export',
      method: 'POST',
      data: { namespace, slug, format }
    });
  },

  getMarkdown(namespace, slug) {
    return request({
      url: `/api/yuque/markdown/${namespace}/${slug}`,
      method: 'GET'
    });
  },

  getRepoDocs(namespace) {
    return request({
      url: '/api/yuque/docs/' + namespace,
      method: 'GET'
    });
  },

  batchExport(namespace, format) {
    return request({
      url: '/api/yuque/batch-export',
      method: 'POST',
      data: { namespace, format }
    });
  }
};

// ==================== 腾讯文档 API ====================
const tencentApi = {
  exportDocument(fileId, fileType, format) {
    return request({
      url: '/api/tencent/export',
      method: 'POST',
      data: { fileId, fileType, format }
    });
  },

  getExportResult(fileId, operationId) {
    return request({
      url: `/api/tencent/export/result/${fileId}/${operationId}`,
      method: 'GET'
    });
  }
};

// ==================== Google Docs API ====================
const googleApi = {
  exportDocument(docId, docType, format) {
    return request({
      url: '/api/google/export',
      method: 'POST',
      data: { docId, docType, format }
    });
  },

  getDirectUrl(docId, docType, format) {
    return request({
      url: `/api/google/direct-url/${docId}`,
      method: 'GET',
      data: { docType, format }
    });
  },

  getFormats(docType) {
    return request({
      url: '/api/google/formats/' + docType,
      method: 'GET'
    });
  }
};

// ==================== 统一平台调度 ====================
const cloudDocApi = {
  getExportApi(platform) {
    const apiMap = {
      feishu: feishuApi,
      dingtalk: feishuApi,
      notion: notionApi,
      yuque: yuqueApi,
      tencent: tencentApi,
      google: googleApi
    };
    return apiMap[platform] || feishuApi;
  },

  async exportDocument(parsedInfo, format) {
    const platform = parsedInfo.platform;
    const token = parsedInfo.token;

    switch (platform) {
      case 'feishu':
        if (format === 'markdown' || format === 'md') {
          return await feishuApi.getMarkdownContent(token);
        }
        return await feishuApi.createExportTask(token, parsedInfo.type, format);

      case 'dingtalk':
        return await feishuApi.createExportTask(token, parsedInfo.type, format, 'dingtalk');

      case 'notion':
        return await notionApi.exportDocument(token, format);

      case 'yuque':
        var parts = token.split('/');
        return await yuqueApi.exportDocument(parts[0], parts[1], format);

      case 'tencent':
        return await tencentApi.exportDocument(token, parsedInfo.type, format);

      case 'google':
        return await googleApi.exportDocument(token, parsedInfo.type, format);

      default:
        throw new Error('不支持的平台: ' + platform);
    }
  }
};

const downloadHistory = {
  addRecord(record) {
    const history = wx.getStorageSync('download_history') || [];
    record.id = Date.now();
    record.createdAt = new Date().toLocaleString();
    history.unshift(record);
    wx.setStorageSync('download_history', history);
    return record;
  },

  getHistory() {
    return wx.getStorageSync('download_history') || [];
  },

  deleteRecord(id) {
    const history = wx.getStorageSync('download_history') || [];
    const newHistory = history.filter(item => item.id !== id);
    wx.setStorageSync('download_history', newHistory);
  },

  clearHistory() {
    wx.removeStorageSync('download_history');
  },

  updateRecord(id, updates) {
    const history = wx.getStorageSync('download_history') || [];
    const index = history.findIndex(item => item.id === id);
    if (index !== -1) {
      history[index] = Object.assign({}, history[index], updates);
      wx.setStorageSync('download_history', history);
    }
  }
};

// 文件下载辅助：云托管模式下用 callContainer，否则用 wx.downloadFile
const downloadFile = (fileUrl) => {
  return new Promise((resolve, reject) => {
    var app = getApp();
    var useCloud = app && app.globalData && app.globalData.useCloud;
    var isExternal = /^https?:\/\//i.test(fileUrl);

    // 外部链接（如飞书 CDN）：直接用 wx.downloadFile
    if (isExternal) {
      wx.downloadFile({
        url: fileUrl,
        success: resolve,
        fail: reject
      });
      return;
    }

    // 服务器相对路径
    if (useCloud && wx.cloud && wx.cloud.callContainer) {
      wx.cloud.callContainer({
        config: { env: app.globalData.cloudEnvId },
        path: fileUrl,
        method: 'GET',
        responseType: 'arraybuffer',
        success: function (res) {
          if (res.statusCode === 200 && res.data) {
            // 将 ArrayBuffer 写入临时文件
            var fs = wx.getFileSystemManager();
            var tempPath = wx.env.USER_DATA_PATH + '/dl_' + Date.now();
            fs.writeFile({
              filePath: tempPath,
              data: res.data,
              encoding: 'binary',
              success: function () {
                resolve({ tempFilePath: tempPath, statusCode: 200 });
              },
              fail: function (err) { reject(err); }
            });
          } else {
            reject(new Error('下载失败：' + res.statusCode));
          }
        },
        fail: function (err) {
          // 云托管失败，降级到直连
          var serverUrl = app.globalData.serverUrl;
          wx.downloadFile({
            url: serverUrl + fileUrl,
            success: resolve,
            fail: reject
          });
        }
      });
    } else {
      var serverUrl = (app && app.globalData && app.globalData.serverUrl) || 'http://localhost:3000';
      wx.downloadFile({
        url: serverUrl + fileUrl,
        success: resolve,
        fail: reject
      });
    }
  });
};

module.exports = {
  request,
  feishuApi,
  notionApi,
  yuqueApi,
  tencentApi,
  googleApi,
  cloudDocApi,
  downloadHistory,
  downloadFile
};
