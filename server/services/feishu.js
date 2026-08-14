const axios = require('axios');
const config = require('../config');

class FeishuService {
  constructor() {
    this.baseUrl = config.feishu.baseUrl;
  }

  async getTenantAccessToken() {
    const now = Date.now();
    if (config.feishu.tokenCache && config.feishu.tokenExpireTime > now) {
      return config.feishu.tokenCache;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/auth/v3/tenant_access_token/internal`,
        {
          app_id: config.feishu.appId,
          app_secret: config.feishu.appSecret
        }
      );

      if (response.data.code === 0) {
        config.feishu.tokenCache = response.data.tenant_access_token;
        config.feishu.tokenExpireTime = now + (response.data.expire - 300) * 1000;
        return config.feishu.tokenCache;
      } else {
        throw new Error(response.data.msg || '获取飞书 access_token 失败');
      }
    } catch (err) {
      throw new Error(err.response?.data?.msg || err.message || '获取飞书 access_token 失败');
    }
  }

  async createExportTask(token, type, fileExtension) {
    const accessToken = await this.getTenantAccessToken();
    
    const response = await axios.post(
      `${this.baseUrl}/drive/v1/export_tasks`,
      {
        token: token,
        type: type,
        file_extension: fileExtension
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=utf-8'
        }
      }
    );

    if (response.data.code !== 0) {
      throw new Error(response.data.msg || '创建导出任务失败');
    }

    return response.data.data;
  }

  async getExportTaskResult(taskId) {
    const accessToken = await this.getTenantAccessToken();
    
    const response = await axios.get(
      `${this.baseUrl}/drive/v1/export_tasks/${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (response.data.code !== 0) {
      throw new Error(response.data.msg || '查询导出任务状态失败');
    }

    return response.data;
  }

  async getDocumentContent(token, type = 'docx', contentType = 'markdown') {
    const accessToken = await this.getTenantAccessToken();
    
    const response = await axios.get(
      `${this.baseUrl}/docs/v1/content`,
      {
        params: {
          doc_token: token,
          doc_type: type,
          content_type: contentType
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (response.data.code !== 0) {
      throw new Error(response.data.msg || '获取文档内容失败');
    }

    return response.data;
  }

  async downloadFile(fileUrl) {
    const response = await axios.get(fileUrl, {
      responseType: 'stream',
      timeout: 60000
    });

    return response.data;
  }

  async batchExport(items) {
    const results = [];
    const tasks = [];

    for (const item of items) {
      if (item.platform === 'feishu') {
        try {
          const taskData = await this.createExportTask(item.token, item.type, item.format);
          tasks.push({
            ...item,
            taskId: taskData.task_id,
            status: 'processing'
          });
        } catch (err) {
          results.push({
            url: item.url,
            token: item.token,
            status: 'failed',
            error: err.message
          });
        }
      }
    }

    const taskResults = await this.pollBatchResults(tasks);
    return [...results, ...taskResults];
  }

  async pollBatchResults(tasks, maxAttempts = 30) {
    const results = [];
    const pendingTasks = [...tasks];

    for (let attempt = 0; attempt < maxAttempts && pendingTasks.length > 0; attempt++) {
      await new Promise(resolve => setTimeout(resolve, config.download.pollInterval));
      
      for (let i = pendingTasks.length - 1; i >= 0; i--) {
        const task = pendingTasks[i];
        try {
          const status = await this.getExportTaskResult(task.taskId);
          const result = status.data.result;

          if (result.job_status === 0) {
            results.push({
              url: task.url,
              token: task.token,
              status: 'success',
              fileUrl: result.file_url,
              taskId: task.taskId
            });
            pendingTasks.splice(i, 1);
          } else if (result.job_status === 2) {
            results.push({
              url: task.url,
              token: task.token,
              status: 'failed',
              error: '导出任务失败',
              taskId: task.taskId
            });
            pendingTasks.splice(i, 1);
          }
        } catch (err) {
          results.push({
            url: task.url,
            token: task.token,
            status: 'failed',
            error: err.message,
            taskId: task.taskId
          });
          pendingTasks.splice(i, 1);
        }
      }
    }

    for (const task of pendingTasks) {
      results.push({
        url: task.url,
        token: task.token,
        status: 'timeout',
        taskId: task.taskId
      });
    }

    return results;
  }
}

module.exports = new FeishuService();
