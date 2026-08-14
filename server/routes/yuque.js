const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yuqueService = require('../services/yuque');
const config = require('../config');

const router = express.Router();

// 导出语雀文档
router.post('/export', async (req, res) => {
  try {
    const { namespace, slug, format } = req.body;

    if (!namespace || !slug) {
      return res.json({ code: 400, msg: '缺少必要参数：namespace, slug' });
    }

    const result = await yuqueService.exportDocument(namespace, slug, format || 'markdown');

    if (result.content) {
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
          title: result.title,
          downloadUrl: `/api/yuque/download/${savedFileName}`,
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
    console.error('Yuque export error:', err);
    res.json({ code: 500, msg: err.message || '语雀导出失败' });
  }
});

// 获取文档 Markdown 内容
router.get('/markdown/:namespace/:slug', async (req, res) => {
  try {
    const { namespace, slug } = req.params;
    const doc = await yuqueService.getDocument(namespace, slug);

    res.json({
      code: 0,
      msg: 'success',
      data: {
        content: doc.body,
        title: doc.title,
        type: 'markdown'
      }
    });
  } catch (err) {
    console.error('Yuque markdown error:', err);
    res.json({ code: 500, msg: err.message || '获取语雀文档失败' });
  }
});

// 获取知识库文档列表
router.get('/docs/:namespace', async (req, res) => {
  try {
    const { namespace } = req.params;
    const docs = await yuqueService.getRepoDocs(namespace);

    res.json({
      code: 0,
      msg: 'success',
      data: docs
    });
  } catch (err) {
    console.error('Yuque docs list error:', err);
    res.json({ code: 500, msg: err.message || '获取文档列表失败' });
  }
});

// 批量导出知识库
router.post('/batch-export', async (req, res) => {
  try {
    const { namespace, format } = req.body;

    if (!namespace) {
      return res.json({ code: 400, msg: '缺少必要参数：namespace' });
    }

    const results = await yuqueService.batchExportRepo(namespace, format || 'markdown');

    res.json({
      code: 0,
      msg: 'success',
      data: { results }
    });
  } catch (err) {
    console.error('Yuque batch export error:', err);
    res.json({ code: 500, msg: err.message || '批量导出失败' });
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
    console.error('Yuque download error:', err);
    res.status(500).json({ code: 500, msg: err.message || '下载失败' });
  }
});

// 配置检查
router.get('/config', (req, res) => {
  res.json({
    code: 0,
    msg: 'success',
    data: {
      configured: !!(config.yuque.authToken || config.yuque.csrfToken),
      supportedFormats: ['markdown', 'html']
    }
  });
});

module.exports = router;
