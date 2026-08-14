const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dingtalkService = require('../services/dingtalk');
const config = require('../config');

const router = express.Router();

router.post('/export', async (req, res) => {
  try {
    const { token, type, format } = req.body;
    
    if (!token || !type || !format) {
      return res.json({ code: 400, msg: '缺少必要参数：token, type, format' });
    }

    const data = await dingtalkService.exportDocument(token, type, format);

    res.json({
      code: 0,
      msg: 'success',
      data: data
    });
  } catch (err) {
    console.error('DingTalk export error:', err);
    res.json({ code: 500, msg: err.message || '钉钉导出失败' });
  }
});

router.get('/export/result/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const data = await dingtalkService.getExportResult(taskId);

    res.json(data);
  } catch (err) {
    console.error('DingTalk get result error:', err);
    res.json({ code: 500, msg: err.message || '查询任务状态失败' });
  }
});

router.post('/save-file', async (req, res) => {
  try {
    const { fileUrl, fileName } = req.body;
    
    if (!fileUrl || !fileName) {
      return res.json({ code: 400, msg: '缺少必要参数' });
    }

    if (!fs.existsSync(config.download.dir)) {
      fs.mkdirSync(config.download.dir, { recursive: true });
    }

    const uniqueId = crypto.randomUUID();
    const ext = path.extname(fileName) || '.bin';
    const savedFileName = `${uniqueId}${ext}`;
    const savePath = path.join(config.download.dir, savedFileName);

    const fileStream = await dingtalkService.downloadFile(fileUrl);
    const writeStream = fs.createWriteStream(savePath);
    
    fileStream.pipe(writeStream);

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const fileSize = fs.statSync(savePath).size;

    res.json({
      code: 0,
      msg: 'success',
      data: {
        fileId: savedFileName,
        fileName: fileName,
        fileSize: fileSize,
        downloadUrl: `/api/dingtalk/download/${savedFileName}`
      }
    });
  } catch (err) {
    console.error('DingTalk save file error:', err);
    res.json({ code: 500, msg: err.message || '保存文件失败' });
  }
});

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
    console.error('DingTalk download error:', err);
    res.status(500).json({ code: 500, msg: err.message || '下载失败' });
  }
});

router.get('/config', (req, res) => {
  res.json({
    code: 0,
    msg: 'success',
    data: {
      configured: !!(config.dingtalk.appId && config.dingtalk.appSecret)
    }
  });
});

module.exports = router;
