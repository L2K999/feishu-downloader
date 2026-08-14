const request = (options) => {
  return new Promise((resolve, reject) => {
    const app = getApp();
    const serverUrl = (app && app.globalData && app.globalData.serverUrl) || 'http://localhost:3000';
    
    wx.request({
      url: serverUrl + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'content-type': 'application/json',
        'Authorization': wx.getStorageSync('token') || '',
        'X-Platform': options.platform || 'feishu'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(res.data);
        }
      },
      fail: (err) => {
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
        reject(err);
      }
    });
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
  // 根据平台获取导出 API
  getExportApi(platform) {
    const apiMap = {
      feishu: feishuApi,
      dingtalk: feishuApi, // 钉钉复用 feishu 路由结构
      notion: notionApi,
      yuque: yuqueApi,
      tencent: tencentApi,
      google: googleApi
    };
    return apiMap[platform] || feishuApi;
  },

  // 统一导出入口
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
        // 语雀 token 格式: namespace/slug
        const [ns, slug] = token.split('/');
        return await yuqueApi.exportDocument(ns, slug, format);

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
      history[index] = { ...history[index], ...updates };
      wx.setStorageSync('download_history', history);
    }
  }
};

module.exports = {
  request,
  feishuApi,
  notionApi,
  yuqueApi,
  tencentApi,
  googleApi,
  cloudDocApi,
  downloadHistory
};
