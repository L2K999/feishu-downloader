const { downloadHistory } = require('../../utils/api.js');
const { formatTime, formatStatus } = require('../../utils/util.js');

Page({
  data: {
    history: [],
    isEmpty: true,
    previewContent: null
  },

  onShow() {
    this.loadHistory();
  },

  loadHistory() {
    const history = downloadHistory.getHistory();
    const formattedHistory = history.map(function(item) {
      return Object.assign({}, item, {
        statusInfo: formatStatus(item.status),
        timeStr: formatTime(item.createdAt)
      });
    });
    this.setData({
      history: formattedHistory,
      isEmpty: formattedHistory.length === 0
    });
  },

  viewFile(e) {
    const id = e.currentTarget.dataset.id;
    const record = this.data.history.find(function(item) { return item.id === id; });
    if (!record) return;

    if (record.content) {
      this.setData({ previewContent: record.content });
    } else if (record.tempFilePath) {
      wx.openDocument({
        filePath: record.tempFilePath,
        fail: function() {
          wx.showToast({ title: '无法打开文件', icon: 'none' });
        }
      });
    }
  },

  copyContent(e) {
    const id = e.currentTarget.dataset.id;
    const record = this.data.history.find(function(item) { return item.id === id; });
    if (record && record.content) {
      wx.setClipboardData({
        data: record.content,
        success: function() {
          wx.showToast({ title: '已复制', icon: 'success' });
        }
      });
    }
  },

  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    const that = this;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: function(res) {
        if (res.confirm) {
          downloadHistory.deleteRecord(id);
          that.loadHistory();
        }
      }
    });
  },

  clearAll() {
    if (this.data.isEmpty) return;
    const that = this;
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有下载记录吗？',
      success: function(res) {
        if (res.confirm) {
          downloadHistory.clearHistory();
          that.loadHistory();
        }
      }
    });
  },

  closePreview() {
    this.setData({ previewContent: null });
  }
});