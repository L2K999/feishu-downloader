const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const googleService = require('../services/google');
const config = require('../config');

const router = express.Router();

// 导出 Google 文档
router.post('/export', async (req, res) => {
  try {
    const { docId, docType, format, accessToken } = req.body;

    if (!docId) {
      return res.json({ code: 400, msg: '缺少必要参数：docId' });
    }

    const result = await googleService.exportDocument(
      docId,
      docType || 'doc',
      format || 'pdf',
      accessToken || null
    );

    if (result.data) {
      // 将文件保存到本地
      if (!fs.existsSync(config.download.dir)) {
        fs.mkdirSync(config.download.dir, { recursive: true });
      }

      const fileId = crypto.randomUUID();
      const ext = path.extname(result.fileName) || `.${format}`;
      const savedFileName = `${fileId}${ext}`;
      const savePath = path.join(config.download.dir, savedFileName);

      fs.writeFileSync(savePath, result.data);

      const fileSize = fs.statSync(savePath).size;

      return res.json({
        code: 0,
        msg: 'success',
        data: {
          fileId: savedFileName,
          fileName: result.fileName,
          fileSize: fileSize,
          format: result.format,
          downloadUrl: `/api/google/download/${savedFileName}`
        }
      });
    }

    res.json({
      code: 0,
      msg: 'success',
      data: result
    });
  } catch (err) {
    console.error('Google export error:', err);
    res.json({ code: 500, msg: err.message || 'Google 文档导出失败' });
  }
});

// 获取直接下载链接（前端可直接使用此 URL 下载公开文档）
router.get('/direct-url/:docId', (req, res) => {
  try {
    const { docId } = req.params;
    const { docType, format } = req.query;

    const exportUrl = googleService.buildExportUrl(
      docId,
      docType || 'doc',
      format || 'pdf'
    );

    res.json({
      code: 0,
      msg: 'success',
      data: {
        url: exportUrl,
        note: '此链接适用于公开文档。私有文档需要 OAuth 授权。'
      }
    });
  } catch (err) {
    console.error('Google direct URL error:', err);
    res.json({ code: 500, msg: err.message || '生成下载链接失败' });
  }
});

// 获取支持的格式
router.get('/formats/:docType', (req, res) => {
  try {
    const { docType } = req.params;
    const formats = googleService.getSupportedFormats(docType);

    res.json({
      code: 0,
      msg: 'success',
      data: formats
    });
  } catch (err) {
    res.json({ code: 500, msg: err.message || '获取格式列表失败' });
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
    console.error('Google download error:', err);
    res.status(500).json({ code: 500, msg: err.message || '下载失败' });
  }
});

// 配置检查
router.get('/config', (req, res) => {
  res.json({
    code: 0,
    msg: 'success',
    data: {
      configured: !!(config.google.apiKey || config.google.clientId),
      supportsPublicDocs: true,
      supportsPrivateDocs: !!(config.google.clientId && config.google.clientSecret),
      supportedFormats: {
        doc: ['pdf', 'docx', 'html', 'txt', 'md', 'odt', 'rtf'],
        sheet: ['pdf', 'xlsx', 'csv', 'html'],
        slide: ['pdf', 'pptx', 'txt']
      }
    }
  });
});

module.exports = router;
