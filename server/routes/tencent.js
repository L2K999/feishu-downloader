const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const tencentService = require('../services/tencent');
const config = require('../config');

const router = express.Router();

// 异步导出腾讯文档
router.post('/export', async (req, res) => {
  try {
    const { fileId, fileType, format } = req.body;

    if (!fileId) {
      return res.json({ code: 400, msg: '缺少必要参数：fileId' });
    }

    const result = await tencentService.exportDocument(fileId, fileType || 'doc', format || 'pdf');

    res.json({
      code: 0,
      msg: 'success',
      data: {
        operationId: result.operationID || result.data?.operationID,
        fileId: fileId,
        status: 'processing'
      }
    });
  } catch (err) {
    console.error('Tencent export error:', err);
    res.json({ code: 500, msg: err.message || '腾讯文档导出失败' });
  }
});

// 查询导出进度
router.get('/export/result/:fileId/:operationId', async (req, res) => {
  try {
    const { fileId, operationId } = req.params;
    const progress = await tencentService.getExportProgress(fileId, operationId);

    let status = 'processing';
    let fileUrl = null;

    // 兼容不同返回格式
    const progressStatus = progress.status || progress.data?.status;
    if (progressStatus === 1) {
      status = 'success';
      fileUrl = progress.data?.fileUrl || progress.data?.downloadUrl || progress.fileUrl;
    } else if (progressStatus === 2) {
      status = 'failed';
    }

    // 如果导出成功，下载文件到本地
    if (status === 'success' && fileUrl) {
      if (!fs.existsSync(config.download.dir)) {
        fs.mkdirSync(config.download.dir, { recursive: true });
      }

      const savedFileName = `${crypto.randomUUID()}.${format || 'pdf'}`;
      const savePath = path.join(config.download.dir, savedFileName);

      const fileResponse = await axios.get(fileUrl, {
        responseType: 'stream',
        timeout: 60000
      });

      const writeStream = fs.createWriteStream(savePath);
      fileResponse.data.pipe(writeStream);

      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      const fileSize = fs.statSync(savePath).size;

      return res.json({
        code: 0,
        msg: 'success',
        data: {
          status: 'success',
          fileId: savedFileName,
          fileSize: fileSize,
          downloadUrl: `/api/tencent/download/${savedFileName}`
        }
      });
    }

    res.json({
      code: 0,
      msg: 'success',
      data: {
        status: status,
        operationId: operationId
      }
    });
  } catch (err) {
    console.error('Tencent export result error:', err);
    res.json({ code: 500, msg: err.message || '查询导出进度失败' });
  }
});

// 获取文档信息
router.get('/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileInfo = await tencentService.getFileInfo(fileId);

    res.json({
      code: 0,
      msg: 'success',
      data: fileInfo
    });
  } catch (err) {
    console.error('Tencent file info error:', err);
    res.json({ code: 500, msg: err.message || '获取文档信息失败' });
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
    console.error('Tencent download error:', err);
    res.status(500).json({ code: 500, msg: err.message || '下载失败' });
  }
});

// 配置检查
router.get('/config', (req, res) => {
  res.json({
    code: 0,
    msg: 'success',
    data: {
      configured: !!(config.tencent.appId && config.tencent.appSecret),
      supportedFormats: ['docx', 'pdf', 'xlsx', 'csv', 'markdown'],
      note: '每用户每天限调用 9 次导出'
    }
  });
});

module.exports = router;
