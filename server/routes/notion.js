const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const notionService = require('../services/notion');
const config = require('../config');

const router = express.Router();

// 导出 Notion 页面为 Markdown
router.post('/export', async (req, res) => {
  try {
    const { pageId, format } = req.body;

    if (!pageId) {
      return res.json({ code: 400, msg: '缺少必要参数：pageId' });
    }

    const result = await notionService.exportDocument(pageId, format || 'markdown');

    if (result.content) {
      // 将内容保存为文件
      if (!fs.existsSync(config.download.dir)) {
        fs.mkdirSync(config.download.dir, { recursive: true });
      }

      const fileId = crypto.randomUUID();
      const ext = path.extname(result.fileName) || '.md';
      const savedFileName = `${fileId}${ext}`;
      const savePath = path.join(config.download.dir, savedFileName);

      fs.writeFileSync(savePath, result.content, 'utf-8');
      const fileSize = fs.statSync(savePath).size;

      return res.json({
        code: 0,
        msg: 'success',
        data: {
          fileId: savedFileName,
          fileName: result.fileName,
          fileSize: fileSize,
          format: result.format,
          downloadUrl: `/api/notion/download/${savedFileName}`,
          note: result.note || null
        }
      });
    }

    res.json({
      code: 0,
      msg: 'success',
      data: result
    });
  } catch (err) {
    console.error('Notion export error:', err);
    res.json({ code: 500, msg: err.message || 'Notion 导出失败' });
  }
});

// 直接获取 Markdown 内容
router.get('/markdown/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const result = await notionService.getPageMarkdown(pageId);

    res.json({
      code: 0,
      msg: 'success',
      data: {
        content: result.markdown || result,
        type: 'markdown'
      }
    });
  } catch (err) {
    console.error('Notion markdown error:', err);
    res.json({ code: 500, msg: err.message || '获取 Notion Markdown 失败' });
  }
});

// 获取页面信息
router.get('/page/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const result = await notionService.getPageInfo(pageId);

    res.json({
      code: 0,
      msg: 'success',
      data: result
    });
  } catch (err) {
    console.error('Notion page info error:', err);
    res.json({ code: 500, msg: err.message || '获取页面信息失败' });
  }
});

// 搜索页面
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    const result = await notionService.searchPages(query || '');

    res.json({
      code: 0,
      msg: 'success',
      data: result
    });
  } catch (err) {
    console.error('Notion search error:', err);
    res.json({ code: 500, msg: err.message || '搜索失败' });
  }
});

// 下载文件
router.get('/download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const filePath = path.join(config.download.dir, fileId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ code: 404, msg: '文件不存在' });
    }

    const stat = fs.statSync(filePath);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileId)}"`);

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (err) {
    console.error('Notion download error:', err);
    res.status(500).json({ code: 500, msg: err.message || '下载失败' });
  }
});

// 配置检查
router.get('/config', (req, res) => {
  res.json({
    code: 0,
    msg: 'success',
    data: {
      configured: !!config.notion.apiKey,
      supportedFormats: ['markdown']
    }
  });
});

module.exports = router;
