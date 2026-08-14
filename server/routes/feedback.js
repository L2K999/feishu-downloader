const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const FEEDBACK_FILE = path.join(__dirname, '..', 'data', 'feedback.json');

// 确保 data 目录存在
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 读取反馈数据
function readFeedback() {
  try {
    if (fs.existsSync(FEEDBACK_FILE)) {
      return JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('读取反馈数据失败:', e);
  }
  return [];
}

// 保存反馈数据
function saveFeedback(data) {
  try {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('保存反馈数据失败:', e);
    return false;
  }
}

// 提交反馈
router.post('/', (req, res) => {
  try {
    const { type, content, contact, userAgent, timestamp } = req.body;

    if (!content || content.trim().length < 5) {
      return res.json({
        code: 1,
        msg: '反馈内容至少5个字'
      });
    }

    const feedbackList = readFeedback();
    
    const newFeedback = {
      id: Date.now().toString(),
      type: type || 'suggestion',
      content: content.trim(),
      contact: contact || '',
      userAgent: userAgent || 'Unknown',
      timestamp: timestamp || Date.now(),
      createdAt: new Date().toISOString(),
      status: 'pending' // pending, read, resolved
    };

    feedbackList.unshift(newFeedback);
    saveFeedback(feedbackList);

    console.log('[Feedback] 新反馈:', {
      type: newFeedback.type,
      content: newFeedback.content.substring(0, 50) + (newFeedback.content.length > 50 ? '...' : ''),
      contact: newFeedback.contact
    });

    res.json({
      code: 0,
      msg: '反馈提交成功',
      data: { id: newFeedback.id }
    });
  } catch (error) {
    console.error('[Feedback] 提交失败:', error);
    res.status(500).json({
      code: 1,
      msg: '服务器内部错误'
    });
  }
});

// 获取反馈列表（管理员用）
router.get('/', (req, res) => {
  try {
    const { status, type, limit = 50 } = req.query;
    let feedbackList = readFeedback();

    // 筛选
    if (status) {
      feedbackList = feedbackList.filter(f => f.status === status);
    }
    if (type) {
      feedbackList = feedbackList.filter(f => f.type === type);
    }

    // 限制数量
    feedbackList = feedbackList.slice(0, parseInt(limit));

    res.json({
      code: 0,
      data: {
        total: readFeedback().length,
        list: feedbackList
      }
    });
  } catch (error) {
    console.error('[Feedback] 获取列表失败:', error);
    res.status(500).json({
      code: 1,
      msg: '服务器内部错误'
    });
  }
});

// 标记为已读
router.put('/:id/read', (req, res) => {
  try {
    const feedbackList = readFeedback();
    const index = feedbackList.findIndex(f => f.id === req.params.id);

    if (index === -1) {
      return res.json({ code: 1, msg: '反馈不存在' });
    }

    feedbackList[index].status = 'read';
    feedbackList[index].readAt = new Date().toISOString();
    saveFeedback(feedbackList);

    res.json({ code: 0, msg: '已标记为已读' });
  } catch (error) {
    console.error('[Feedback] 标记失败:', error);
    res.status(500).json({ code: 1, msg: '服务器内部错误' });
  }
});

// 删除反馈
router.delete('/:id', (req, res) => {
  try {
    const feedbackList = readFeedback();
    const filteredList = feedbackList.filter(f => f.id !== req.params.id);
    
    if (filteredList.length === feedbackList.length) {
      return res.json({ code: 1, msg: '反馈不存在' });
    }

    saveFeedback(filteredList);
    res.json({ code: 0, msg: '删除成功' });
  } catch (error) {
    console.error('[Feedback] 删除失败:', error);
    res.status(500).json({ code: 1, msg: '服务器内部错误' });
  }
});

module.exports = router;