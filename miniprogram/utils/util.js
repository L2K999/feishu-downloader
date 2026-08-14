const formatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const PLATFORM_PATTERNS = [
  {
    name: 'feishu',
    label: '飞书',
    domains: ['feishu.cn', 'larksuite.com', 'larkoffice.com'],
    match(urlObj, pathname) {
      const patterns = [
        { regex: /\/docx\/([a-zA-Z0-9]+)/, type: 'docx' },
        { regex: /\/doc\/([a-zA-Z0-9]+)/, type: 'doc' },
        { regex: /\/sheets\/([a-zA-Z0-9]+)/, type: 'sheet' },
        { regex: /\/wiki\/([a-zA-Z0-9]+)/, type: 'wiki' },
        { regex: /\/bitable\/([a-zA-Z0-9]+)/, type: 'bitable' }
      ];
      for (const p of patterns) {
        const match = pathname.match(p.regex);
        if (match) return { token: match[1], type: p.type };
      }
      return null;
    }
  },
  {
    name: 'dingtalk',
    label: '钉钉',
    domains: ['dingtalk.com', 'dingapps.com'],
    match(urlObj, pathname) {
      const patterns = [
        { regex: /\/doc\/([a-zA-Z0-9]+)/, type: 'doc' },
        { regex: /\/sheet\/([a-zA-Z0-9]+)/, type: 'sheet' },
        { regex: /\/wiki\/([a-zA-Z0-9]+)/, type: 'wiki' }
      ];
      for (const p of patterns) {
        const match = pathname.match(p.regex);
        if (match) return { token: match[1], type: p.type };
      }
      return null;
    }
  },
  {
    name: 'notion',
    label: 'Notion',
    domains: ['notion.so', 'notion.site'],
    match(urlObj, pathname) {
      const patterns = [
        { regex: /\/([a-zA-Z0-9-]+)/, type: 'page' }
      ];
      for (const p of patterns) {
        const match = pathname.match(p.regex);
        if (match && match[1].length > 10) return { token: match[1], type: p.type };
      }
      return null;
    }
  },
  {
    name: 'yuque',
    label: '语雀',
    domains: ['yuque.com'],
    match(urlObj, pathname) {
      const patterns = [
        { regex: /\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-]+)/, type: 'doc' }
      ];
      for (const p of patterns) {
        const match = pathname.match(p.regex);
        if (match) return { token: `${match[1]}/${match[2]}`, type: p.type };
      }
      return null;
    }
  },
  {
    name: 'tencent',
    label: '腾讯文档',
    domains: ['docs.qq.com'],
    match(urlObj, pathname) {
      const patterns = [
        { regex: /\/sheet\/([a-zA-Z0-9]+)/, type: 'sheet' },
        { regex: /\/doc\/([a-zA-Z0-9]+)/, type: 'doc' },
        { regex: /\/slide\/([a-zA-Z0-9]+)/, type: 'slide' }
      ];
      for (const p of patterns) {
        const match = pathname.match(p.regex);
        if (match) return { token: match[1], type: p.type };
      }
      return null;
    }
  },
  {
    name: 'google',
    label: 'Google Docs',
    domains: ['docs.google.com'],
    match(urlObj, pathname) {
      if (pathname.includes('/document/')) {
        const match = pathname.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
        if (match) return { token: match[1], type: 'doc' };
      }
      if (pathname.includes('/spreadsheets/')) {
        const match = pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
        if (match) return { token: match[1], type: 'sheet' };
      }
      if (pathname.includes('/presentation/')) {
        const match = pathname.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
        if (match) return { token: match[1], type: 'slide' };
      }
      return null;
    }
  }
];

const safeParseUrl = (url) => {
  const result = { hostname: '', pathname: '/' };
  try {
    const match = url.match(/^https?:\/\/([^\/?#:]+)(:[0-9]+)?([\/?#].*)?$/i);
    if (match) {
      result.hostname = match[1].toLowerCase();
      const rest = match[3] || '/';
      const qIdx = rest.indexOf('?');
      const hIdx = rest.indexOf('#');
      let pathEnd = rest.length;
      if (qIdx >= 0) pathEnd = Math.min(pathEnd, qIdx);
      if (hIdx >= 0) pathEnd = Math.min(pathEnd, hIdx);
      result.pathname = rest.substring(0, pathEnd) || '/';
    }
  } catch (e) {}
  return result;
};

const parseCloudUrl = (url) => {
  const result = { 
    platform: '', 
    platformLabel: '', 
    token: '', 
    type: '', 
    valid: false,
    supported: false 
  };
  
  if (!url || typeof url !== 'string') return result;
  
  try {
    const { hostname, pathname } = safeParseUrl(url);
    if (!hostname) return result;
    
    for (const platform of PLATFORM_PATTERNS) {
      if (platform.domains.some(d => hostname === d || hostname.endsWith('.' + d))) {
        const matchResult = platform.match({ hostname, pathname }, pathname);
        if (matchResult) {
          result.platform = platform.name;
          result.platformLabel = platform.label;
          result.token = matchResult.token;
          result.type = matchResult.type;
          result.valid = true;
          result.supported = ['feishu', 'dingtalk', 'notion', 'yuque', 'tencent', 'google'].includes(platform.name);
          return result;
        }
      }
    }
    
    result.valid = false;
  } catch (e) {
    result.valid = false;
  }
  
  return result;
};

const parseFeishuUrl = (url) => {
  const result = parseCloudUrl(url);
  if (result.platform === 'feishu') {
    return {
      token: result.token,
      type: result.type,
      valid: result.valid,
      platform: result.platform
    };
  }
  return { token: '', type: '', valid: false, platform: '' };
};

const getSupportedFormats = (platform, docType) => {
  const formatMap = {
    feishu: {
      docx: [
        { value: 'docx', label: 'Word (.docx)', desc: '保留原始格式' },
        { value: 'pdf', label: 'PDF (.pdf)', desc: '适合阅读分享' },
        { value: 'markdown', label: 'Markdown (.md)', desc: '纯文本格式' }
      ],
      doc: [
        { value: 'docx', label: 'Word (.docx)', desc: '保留原始格式' },
        { value: 'pdf', label: 'PDF (.pdf)', desc: '适合阅读分享' }
      ],
      sheet: [
        { value: 'xlsx', label: 'Excel (.xlsx)', desc: '保留原始格式' },
        { value: 'csv', label: 'CSV (.csv)', desc: '纯数据格式' }
      ],
      bitable: [
        { value: 'xlsx', label: 'Excel (.xlsx)', desc: '保留原始格式' },
        { value: 'csv', label: 'CSV (.csv)', desc: '纯数据格式' }
      ],
      wiki: [
        { value: 'docx', label: 'Word (.docx)', desc: '保留原始格式' },
        { value: 'pdf', label: 'PDF (.pdf)', desc: '适合阅读分享' }
      ],
      default: [
        { value: 'docx', label: 'Word (.docx)' },
        { value: 'pdf', label: 'PDF (.pdf)' }
      ]
    },
    dingtalk: {
      doc: [
        { value: 'docx', label: 'Word (.docx)', desc: '保留原始格式' },
        { value: 'pdf', label: 'PDF (.pdf)', desc: '适合阅读分享' }
      ],
      sheet: [
        { value: 'xlsx', label: 'Excel (.xlsx)', desc: '保留原始格式' },
        { value: 'csv', label: 'CSV (.csv)', desc: '纯数据格式' }
      ],
      wiki: [
        { value: 'docx', label: 'Word (.docx)', desc: '保留原始格式' },
        { value: 'pdf', label: 'PDF (.pdf)', desc: '适合阅读分享' }
      ],
      default: [
        { value: 'docx', label: 'Word (.docx)' },
        { value: 'pdf', label: 'PDF (.pdf)' }
      ]
    },
    notion: {
      page: [
        { value: 'markdown', label: 'Markdown (.md)', desc: '纯文本格式，推荐' },
        { value: 'pdf', label: 'PDF (.pdf)', desc: '适合阅读分享' },
        { value: 'html', label: 'HTML (.html)', desc: '网页格式' }
      ],
      default: [
        { value: 'markdown', label: 'Markdown (.md)', desc: '纯文本格式，推荐' }
      ]
    },
    yuque: {
      doc: [
        { value: 'markdown', label: 'Markdown (.md)', desc: '纯文本格式，推荐' },
        { value: 'html', label: 'HTML (.html)', desc: '网页格式' },
        { value: 'pdf', label: 'PDF (.pdf)', desc: '适合阅读分享' }
      ],
      default: [
        { value: 'markdown', label: 'Markdown (.md)', desc: '纯文本格式，推荐' }
      ]
    },
    tencent: {
      doc: [
        { value: 'docx', label: 'Word (.docx)', desc: '保留原始格式' },
        { value: 'pdf', label: 'PDF (.pdf)', desc: '适合阅读分享' },
        { value: 'markdown', label: 'Markdown (.md)', desc: '纯文本格式' }
      ],
      sheet: [
        { value: 'xlsx', label: 'Excel (.xlsx)', desc: '保留原始格式' },
        { value: 'csv', label: 'CSV (.csv)', desc: '纯数据格式' },
        { value: 'pdf', label: 'PDF (.pdf)', desc: '适合阅读分享' }
      ],
      slide: [
        { value: 'pdf', label: 'PDF (.pdf)', desc: '适合阅读分享' },
        { value: 'pptx', label: 'PowerPoint (.pptx)', desc: '保留原始格式' }
      ],
      default: [
        { value: 'docx', label: 'Word (.docx)' },
        { value: 'pdf', label: 'PDF (.pdf)' }
      ]
    },
    google: {
      doc: [
        { value: 'pdf', label: 'PDF (.pdf)', desc: '适合阅读分享' },
        { value: 'docx', label: 'Word (.docx)', desc: '保留原始格式' },
        { value: 'md', label: 'Markdown (.md)', desc: '纯文本格式' },
        { value: 'html', label: 'HTML (.html)', desc: '网页格式' },
        { value: 'txt', label: '纯文本 (.txt)', desc: '最简格式' },
        { value: 'odt', label: 'OpenDocument (.odt)', desc: '开源格式' },
        { value: 'rtf', label: 'Rich Text (.rtf)', desc: '富文本格式' }
      ],
      sheet: [
        { value: 'pdf', label: 'PDF (.pdf)', desc: '适合阅读分享' },
        { value: 'xlsx', label: 'Excel (.xlsx)', desc: '保留原始格式' },
        { value: 'csv', label: 'CSV (.csv)', desc: '纯数据格式' },
        { value: 'html', label: 'HTML (.html)', desc: '网页格式' }
      ],
      slide: [
        { value: 'pdf', label: 'PDF (.pdf)', desc: '适合阅读分享' },
        { value: 'pptx', label: 'PowerPoint (.pptx)', desc: '保留原始格式' },
        { value: 'txt', label: '纯文本 (.txt)', desc: '最简格式' }
      ],
      default: [
        { value: 'pdf', label: 'PDF (.pdf)' },
        { value: 'docx', label: 'Word (.docx)' }
      ]
    },
    default: {
      default: [
        { value: 'docx', label: 'Word (.docx)' },
        { value: 'pdf', label: 'PDF (.pdf)' }
      ]
    }
  };
  
  const platformFormats = formatMap[platform] || formatMap.default;
  const formats = platformFormats[docType] || platformFormats.default;
  
  const iconMap = {
    docx: '📝', xlsx: '📊', pptx: '🎯', pdf: '📄',
    markdown: '📋', md: '📋', html: '🌐', csv: '📈',
    txt: '📃', odt: '📝', rtf: '📝'
  };
  
  return formats.map(function(f) {
    return Object.assign({}, f, { icon: iconMap[f.value] || '📄' });
  });
};

const formatStatus = (status) => {
  const statusMap = {
    pending: { text: '等待处理', class: 'status-pending' },
    processing: { text: '处理中...', class: 'status-processing' },
    success: { text: '下载成功', class: 'status-success' },
    failed: { text: '下载失败', class: 'status-failed' }
  };
  return statusMap[status] || { text: status, class: '' };
};

const downloadToLocal = (tempFilePath, fileName) => {
  return new Promise((resolve, reject) => {
    wx.saveFile({
      tempFilePath: tempFilePath,
      success: (res) => {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        resolve(res);
      },
      fail: (err) => {
        wx.showToast({
          title: '保存失败: ' + err.errMsg,
          icon: 'none'
        });
        reject(err);
      }
    });
  });
};

const copyToClipboard = (text) => {
  wx.setClipboardData({
    data: text,
    success: () => {
      wx.showToast({
        title: '已复制',
        icon: 'success'
      });
    }
  });
};

const SUPPORTED_PLATFORMS = PLATFORM_PATTERNS.map(p => ({
  name: p.name,
  label: p.label,
  supported: ['feishu', 'dingtalk', 'notion', 'yuque', 'tencent', 'google'].includes(p.name)
}));

module.exports = {
  formatTime,
  formatFileSize,
  parseFeishuUrl,
  parseCloudUrl,
  getSupportedFormats,
  formatStatus,
  downloadToLocal,
  copyToClipboard,
  SUPPORTED_PLATFORMS
};
