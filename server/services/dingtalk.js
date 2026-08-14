const axios = require('axios');
const config = require('../config');

class DingTalkService {
  constructor() {
    this.baseUrl = config.dingtalk.baseUrl;
  }

  async getAccessToken() {
    const now = Date.now();
    if (config.dingtalk.tokenCache && config.dingtalk.tokenExpireTime > now) {
      return config.dingtalk.tokenCache;
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/gettoken`,
        {
          params: {
            appkey: config.dingtalk.appId,
            appsecret: config.dingtalk.appSecret
          }
        }
      );

      if (response.data.errcode === 0) {
        config.dingtalk.tokenCache = response.data.access_token;
        config.dingtalk.tokenExpireTime = now + (response.data.expires_in - 300) * 1000;
        return config.dingtalk.tokenCache;
      } else {
        throw new Error(response.data.errmsg || '获取钉钉 access_token 失败');
      }
    } catch (err) {
      throw new Error(err.response?.data?.errmsg || err.message || '获取钉钉 access_token 失败');
    }
  }

  async exportDocument(docId, docType, format) {
    const accessToken = await this.getAccessToken();
    
    let apiUrl;
    let requestData = {};

    if (docType === 'doc') {
      apiUrl = `${this.baseUrl}/topapi/document/export`;
      requestData = {
        document_id: docId,
        file_extension: format
      };
    } else if (docType === 'sheet') {
      apiUrl = `${this.baseUrl}/topapi/sheet/export`;
      requestData = {
        document_id: docId,
        file_extension: format
      };
    } else if (docType === 'wiki') {
      apiUrl = `${this.baseUrl}/topapi/wiki/export`;
      requestData = {
        document_id: docId,
        file_extension: format
      };
    } else {
      throw new Error(`不支持的文档类型: ${docType}`);
    }

    const response = await axios.post(apiUrl, requestData, {
      params: { access_token: accessToken }
    });

    if (response.data.errcode !== 0) {
      throw new Error(response.data.errmsg || '钉钉导出失败');
    }

    return response.data.result || response.data;
  }

  async getExportResult(taskId) {
    const accessToken = await this.getAccessToken();
    
    const response = await axios.get(
      `${this.baseUrl}/topapi/asyncresult/get`,
      {
        params: {
          access_token: accessToken,
          task_id: taskId
        }
      }
    );

    if (response.data.errcode !== 0) {
      throw new Error(response.data.errmsg || '查询导出结果失败');
    }

    return response.data;
  }

  async downloadFile(fileUrl) {
    const response = await axios.get(fileUrl, {
      responseType: 'stream',
      timeout: 60000,
      headers: {
        'Authorization': `Bearer ${await this.getAccessToken()}`
      }
    });

    return response.data;
  }

  async convertToMarkdown(docId, docType) {
    try {
      const result = await this.exportDocument(docId, docType, 'pdf');
      
      if (result && result.file_url) {
        return {
          success: true,
          content: '',
          note: '钉钉暂不支持直接导出 Markdown，请下载 PDF 后使用转换工具'
        };
      }
      
      throw new Error('导出失败');
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

module.exports = new DingTalkService();
