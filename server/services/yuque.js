const axios = require('axios');
const config = require('../config');

class YuqueService {
  constructor() {
    this.baseUrl = config.yuque.baseUrl;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    // 语雀 v2 API 使用 token 认证
    if (config.yuque.authToken) {
      headers['X-Auth-Token'] = config.yuque.authToken;
    }
    if (config.yuque.csrfToken) {
      headers['X-CSRF-Token'] = config.yuque.csrfToken;
    }
    return headers;
  }

  // 获取文档内容（Markdown 格式）
  async getDocument(namespace, slug) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/repos/${namespace}/docs/${slug}`,
        { headers: this.getHeaders() }
      );
      
      if (response.data.status !== 1) {
        throw new Error(response.data.message || '获取语雀文档失败');
      }
      
      return response.data.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || '获取语雀文档失败');
    }
  }

  // 获取知识库文档列表
  async getRepoDocs(namespace) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/repos/${namespace}/docs`,
        { 
          headers: this.getHeaders(),
          params: { offset: 0, limit: 50 }
        }
      );
      
      if (response.data.status !== 1) {
        throw new Error(response.data.message || '获取语雀文档列表失败');
      }
      
      return response.data.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || '获取语雀文档列表失败');
    }
  }

  // 导出文档
  async exportDocument(namespace, slug, format) {
    const doc = await this.getDocument(namespace, slug);
    
    if (format === 'markdown' || format === 'md') {
      return {
        success: true,
        content: doc.body,
        format: 'markdown',
        title: doc.title,
        fileName: `${doc.title || slug}.md`
      };
    }

    // 语雀原生支持 Markdown，其他格式需转换
    if (format === 'html') {
      return {
        success: true,
        content: doc.body_html || doc.body,
        format: 'html',
        title: doc.title,
        fileName: `${doc.title || slug}.html`
      };
    }

    // 默认返回 Markdown
    return {
      success: true,
      content: doc.body,
      format: 'markdown',
      title: doc.title,
      fileName: `${doc.title || slug}.md`,
      note: '语雀 API 支持导出 Markdown 和 HTML 格式，如需其他格式请下载后转换'
    };
  }

  // 批量导出知识库文档
  async batchExportRepo(namespace, format) {
    const docs = await this.getRepoDocs(namespace);
    const results = [];

    for (const doc of docs) {
      try {
        const exported = await this.exportDocument(namespace, doc.slug, format);
        results.push({
          slug: doc.slug,
          title: doc.title,
          status: 'success',
          content: exported.content,
          fileName: exported.fileName
        });
      } catch (err) {
        results.push({
          slug: doc.slug,
          title: doc.title,
          status: 'failed',
          error: err.message
        });
      }
    }

    return results;
  }
}

module.exports = new YuqueService();
