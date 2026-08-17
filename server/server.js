const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const feishuRoutes = require('./routes/feishu');
const dingtalkRoutes = require('./routes/dingtalk');
const notionRoutes = require('./routes/notion');
const yuqueRoutes = require('./routes/yuque');
const tencentRoutes = require('./routes/tencent');
const googleRoutes = require('./routes/google');
const feedbackRoutes = require('./routes/feedback');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

app.get('/api/health', (req, res) => {
  res.json({ 
    code: 0, 
    msg: 'success', 
    data: { 
      status: 'ok', 
      uptime: process.uptime(),
      platforms: ['feishu', 'dingtalk', 'notion', 'yuque', 'tencent', 'google']
    }
  });
});

app.use('/api/feishu', feishuRoutes);
app.use('/api/dingtalk', dingtalkRoutes);
app.use('/api/notion', notionRoutes);
app.use('/api/yuque', yuqueRoutes);
app.use('/api/tencent', tencentRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/feedback', feedbackRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    code: 500, 
    msg: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

if (process.env.VERCEL) {
  // Vercel Serverless 模式：导出 app，不调用 listen
  module.exports = app;
} else {
  // 本地/传统服务器模式
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================`);
    console.log(`  云文档下载器后端服务`);
    console.log(`  Server running on port ${PORT}`);
    console.log(`  平台: 飞书 | 钉钉 | Notion | 语雀 | 腾讯文档 | Google Docs`);
    console.log(`  反馈 API: /api/feedback`);
    console.log(`========================================`);
  });
}
