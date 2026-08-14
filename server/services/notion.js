const axios = require('axios');
const config = require('../config');

class NotionService {
  constructor() {
    this.baseUrl = config.notion.baseUrl;
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${config.notion.apiKey}`,
      'Notion-Version': config.notion.notionVersion,
      'Content-Type': 'application/json'
    };
  }

  // 获取页面 Markdown 内容
  async getPageMarkdown(pageId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/pages/${pageId}/markdown`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || '获取 Notion 页面内容失败');
    }
  }

  // 获取页面块内容（用于构建其他格式）
  async getPageBlocks(pageId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/blocks/${pageId}/children`,
        { 
          headers: this.getHeaders(),
          params: { page_size: 100 }
        }
      );
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || '获取 Notion 页面块失败');
    }
  }

  // 获取页面元信息
  async getPageInfo(pageId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/pages/${pageId}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || '获取 Notion 页面信息失败');
    }
  }

  // 导出文档 - Notion 主要支持 Markdown 导出
  async exportDocument(pageId, format) {
    if (format === 'markdown' || format === 'md') {
      const markdownData = await this.getPageMarkdown(pageId);
      return {
        success: true,
        content: markdownData.markdown || markdownData,
        format: 'markdown',
        fileName: `notion_${pageId.substring(0, 8)}.md`
      };
    }

    // 对于 PDF/DOCX 格式，Notion API 不直接支持，返回 Markdown 并提示
    const markdownData = await this.getPageMarkdown(pageId);
    return {
      success: true,
      content: markdownData.markdown || markdownData,
      format: 'markdown',
      fileName: `notion_${pageId.substring(0, 8)}.md`,
      note: 'Notion API 仅支持导出 Markdown 格式，如需其他格式请下载后转换'
    };
  }

  // 搜索页面（辅助功能）
  async searchPages(query) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/search`,
        {
          query: query,
          page_size: 20
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || '搜索 Notion 页面失败');
    }
  }
}

module.exports = new NotionService();
