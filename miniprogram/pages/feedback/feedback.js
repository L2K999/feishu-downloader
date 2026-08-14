const request = require('../../utils/api.js').request;

Page({
  data: {
    feedbackContent: '',
    contactInfo: '',
    feedbackType: 'suggestion',
    submitting: false,
    typeOptions: [
      { value: 'suggestion', label: '功能建议', icon: '💡' },
      { value: 'bug', label: '问题反馈', icon: '🐛' },
      { value: 'experience', label: '体验分享', icon: '✨' },
      { value: 'other', label: '其他', icon: '📝' }
    ]
  },

  onInputContent(e) {
    this.setData({ feedbackContent: e.detail.value });
  },

  onInputContact(e) {
    this.setData({ contactInfo: e.detail.value });
  },

  selectType(e) {
    this.setData({ feedbackType: e.currentTarget.dataset.value });
  },

  async submitFeedback() {
    const content = this.data.feedbackContent.trim();
    if (!content) {
      wx.showToast({ title: '请填写反馈内容', icon: 'none' });
      return;
    }

    if (content.length < 5) {
      wx.showToast({ title: '反馈内容至少5个字', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      const result = await request({
        url: '/api/feedback',
        method: 'POST',
        data: {
          type: this.data.feedbackType,
          content: content,
          contact: this.data.contactInfo,
          userAgent: 'WeChat Mini Program',
          timestamp: Date.now()
        }
      });

      if (result.code === 0) {
        wx.showModal({
          title: '提交成功',
          content: '感谢你的反馈！我们会认真阅读每一条建议。',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
      } else {
        throw new Error(result.msg || '提交失败');
      }
    } catch (err) {
      wx.showModal({
        title: '提交失败',
        content: err.message + '\n\n你也可以直接发送邮件到：feedback@example.com',
        showCancel: false
      });
    } finally {
      this.setData({ submitting: false });
    }
  }
});