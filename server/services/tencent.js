const axios = require('axios');
const config = require('../config');

class TencentDocService {
  constructor() {
    this.baseUrl = config.tencent.baseUrl;
  }

  // 获取 access_token
  async getAccessToken() {
    const now = Date.now();
    if (config.tencent.tokenCache && config.tencent.tokenExpireTime > now) {
      return config.tencent.tokenCache;
    }

    try {
      const response = await axios.post(
        'https://docs.qq.com/openapi/drive/v2/oauth/token',
        {
          client_id: config.tencent.appId,
          client_secret: config.tencent.appSecret,
          grant_type: 'client_credentials'
        }
      );

      if (response.data.access_token) {
        config.tencent.tokenCache = response.data.access_token;
        config.tencent.tokenExpireTime = now + (response.data.expires_in - 300) * 1000;
        return config.tencent.tokenCache;
      } else {
        throw new Error(response.data.message || '获取腾讯文档 access_token 失败');
      }
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || '获取腾讯文档 access_token 失败');
    }
  }

  getHeaders(accessToken) {
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  // 异步导出文档
  async exportDocument(fileId, fileType, format) {
    const accessToken = await this.getAccessToken();

    // 格式映射：腾讯文档支持的导出类型
    const formatMap = {
      'docx': 'docx',
      'pdf': 'pdf',
      'xlsx': 'xlsx',
      'csv': 'csv',
      'markdown': 'markdown',
      'md': 'markdown'
    };

    const exportType = formatMap[format] || format;

    try {
      const response = await axios.post(
        `${this.baseUrl}/files/${fileId}/async-export`,
        {
          exportType: exportType,
          fileType: fileType
        },
        { headers: this.getHeaders(accessToken) }
      );

      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || '腾讯文档导出失败');
    }
  }

  // 查询导出进度
  async getExportProgress(fileId, operationId) {
    const accessToken = await this.getAccessToken();

    try {
      const response = await axios.get(
        `${this.baseUrl}/files/${fileId}/export-progress`,
        {
          params: { operationID: operationId },
          headers: this.getHeaders(accessToken)
        }
      );

      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || '查询导出进度失败');
    }
  }

  // 轮询导出结果
  async pollExportResult(fileId, operationId, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, config.download.pollInterval));
      
      const progress = await this.getExportProgress(fileId, operationId);
      
      // status: 0=处理中, 1=成功, 2=失败
      if (progress.status === 1 || progress.code === 0 && progress.data?.status === 1) {
        return {
          success: true,
          fileUrl: progress.data?.fileUrl || progress.data?.downloadUrl || progress.fileUrl,
          status: 'success'
        };
      } else if (progress.status === 2 || progress.data?.status === 2) {
        throw new Error('腾讯文档导出失败');
      }
    }

    throw new Error('腾讯文档导出超时');
  }

  // 获取文档信息
  async getFileInfo(fileId) {
    const accessToken = await this.getAccessToken();

    try {
      const response = await axios.get(
        `${this.baseUrl}/files/${fileId}`,
        { headers: this.getHeaders(accessToken) }
      );

      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || '获取腾讯文档信息失败');
    }
  }
}

module.exports = new TencentDocService();
