const axios = require('axios');
const config = require('../config');

class GoogleDocsService {
  constructor() {
    this.baseUrl = config.google.baseUrl;
  }

  // 构建直接导出 URL（适用于公开文档）
  buildExportUrl(docId, docType, format) {
    const typeMap = {
      'doc': 'document',
      'sheet': 'spreadsheets',
      'slide': 'presentation'
    };

    const googleType = typeMap[docType] || 'document';
    return `${this.baseUrl}/${googleType}/d/${docId}/export?format=${format}`;
  }

  // 通过直接 URL 导出（公开文档）
  async exportPublicDocument(docId, docType, format) {
    const exportUrl = this.buildExportUrl(docId, docType, format);

    try {
      const response = await axios.get(exportUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
        maxRedirects: 5
      });

      const fileExt = this.getFileExtension(format);
      const fileName = `google_${docId.substring(0, 12)}.${fileExt}`;

      return {
        success: true,
        data: response.data,
        format: format,
        fileName: fileName,
        contentType: response.headers['content-type'] || 'application/octet-stream'
      };
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Google 文档导出失败，文档可能需要登录访问');
    }
  }

  // 通过 Google Drive API 导出（需要 OAuth）
  async exportWithOAuth(docId, format, accessToken) {
    const formatMap = {
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'pdf': 'application/pdf',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'csv': 'text/csv',
      'html': 'text/html',
      'txt': 'text/plain',
      'md': 'text/plain',
      'odt': 'application/vnd.oasis.opendocument.text',
      'rtf': 'application/rtf'
    };

    const mimeType = formatMap[format] || formatMap['pdf'];

    try {
      const response = await axios.get(
        `https://www.googleapis.com/drive/v3/files/${docId}/export`,
        {
          params: { mimeType: mimeType },
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          responseType: 'arraybuffer',
          timeout: 60000
        }
      );

      const fileExt = this.getFileExtension(format);
      const fileName = `google_${docId.substring(0, 12)}.${fileExt}`;

      return {
        success: true,
        data: response.data,
        format: format,
        fileName: fileName,
        contentType: mimeType
      };
    } catch (err) {
      throw new Error(err.response?.data?.error?.message || err.message || 'Google Drive API 导出失败');
    }
  }

  // 导出文档（统一入口）
  async exportDocument(docId, docType, format, accessToken = null) {
    if (accessToken) {
      return await this.exportWithOAuth(docId, format, accessToken);
    } else {
      return await this.exportPublicDocument(docId, docType, format);
    }
  }

  // 获取文件扩展名
  getFileExtension(format) {
    const extMap = {
      'docx': 'docx',
      'pdf': 'pdf',
      'xlsx': 'xlsx',
      'csv': 'csv',
      'html': 'html',
      'txt': 'txt',
      'md': 'md',
      'odt': 'odt',
      'rtf': 'rtf'
    };
    return extMap[format] || format;
  }

  // 获取支持的格式列表
  getSupportedFormats(docType) {
    const formats = {
      'doc': [
        { value: 'pdf', label: 'PDF' },
        { value: 'docx', label: 'Word' },
        { value: 'html', label: 'HTML' },
        { value: 'txt', label: '纯文本' },
        { value: 'md', label: 'Markdown' },
        { value: 'odt', label: 'OpenDocument' },
        { value: 'rtf', label: 'Rich Text' }
      ],
      'sheet': [
        { value: 'pdf', label: 'PDF' },
        { value: 'xlsx', label: 'Excel' },
        { value: 'csv', label: 'CSV' },
        { value: 'html', label: 'HTML' }
      ],
      'slide': [
        { value: 'pdf', label: 'PDF' },
        { value: 'pptx', label: 'PowerPoint' },
        { value: 'txt', label: '纯文本' }
      ]
    };

    return formats[docType] || formats['doc'];
  }
}

module.exports = new GoogleDocsService();
