const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const feishuService = require('../services/feishu');
const config = require('../config');

const router = express.Router();

router.post('/parse', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.json({ code: 400, msg: '请提供文档链接' });
    }

    res.json({
      code: 0,
      msg: 'success',
      data: {
        url: url,
        parsed: true
      }
    });
  } catch (err) {
    res.json({ code: 500, msg: err.message });
  }
});

router.post('/export', async (req, res) => {
  try {
    const { token, type, format, platform } = req.body;
    
    if (!token || !type || !format) {
      return res.json({ code: 400, msg: '缺少必要参数：token, type, format' });
    }

    const fileExtension = format === 'markdown' ? 'docx' : format;
    const data = await feishuService.createExportTask(token, type, fileExtension);

    res.json({
      code: 0,
      msg: 'success',
      data: data
    });
  } catch (err) {
    console.error('Export error:', err);
    res.json({ code: 500, msg: err.message || '导出任务创建失败' });
  }
});

router.get('/export/result/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const data = await feishuService.getExportTaskResult(taskId);

    res.json(data);
  } catch (err) {
    console.error('Get result error:', err);
    res.json({ code: 500, msg: err.message || '查询任务状态失败' });
  }
});

router.get('/markdown/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const data = await feishuService.getDocumentContent(token, 'docx', 'markdown');

    res.json({
      code: 0,
      msg: 'success',
      data: {
        content: data.data.content,
        type: 'markdown'
      }
    });
  } catch (err) {
    console.error('Markdown error:', err);
    res.json({ code: 500, msg: err.message || '获取 Markdown 内容失败' });
  }
});

router.post('/batch-export', async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.json({ code: 400, msg: '请提供有效的 items 数组' });
    }

    const batchId = crypto.randomUUID();
    const results = await feishuService.batchExport(items);

    const batchResult = {
      batch_id: batchId,
      results: results.map(r => ({
        url: r.url,
        token: r.token,
        status: r.status,
        fileUrl: r.fileUrl || null,
        error: r.error || null
      }))
    };

    const resultFile = path.join(config.download.dir, `batch_${batchId}.json`);
    if (!fs.existsSync(config.download.dir)) {
      fs.mkdirSync(config.download.dir, { recursive: true });
    }
    fs.writeFileSync(resultFile, JSON.stringify(batchResult, null, 2));

    res.json({
      code: 0,
      msg: 'success',
      data: batchResult
    });
  } catch (err) {
    console.error('Batch export error:', err);
    res.json({ code: 500, msg: err.message || '批量导出失败' });
  }
});

router.get('/batch-result/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const resultFile = path.join(config.download.dir, `batch_${batchId}.json`);

    if (!fs.existsSync(resultFile)) {
      return res.json({ code: 404, msg: '批量任务结果不存在' });
    }

    const data = JSON.parse(fs.readFileSync(resultFile, 'utf-8'));
    res.json({
      code: 0,
      msg: 'success',
      data: data
    });
  } catch (err) {
    console.error('Batch result error:', err);
    res.json({ code: 500, msg: err.message || '获取批量结果失败' });
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
    console.error('Download error:', err);
    res.status(500).json({ code: 500, msg: err.message || '下载失败' });
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

    const fileStream = await feishuService.downloadFile(fileUrl);
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
        downloadUrl: `/api/feishu/download/${savedFileName}`
      }
    });
  } catch (err) {
    console.error('Save file error:', err);
    res.json({ code: 500, msg: err.message || '保存文件失败' });
  }
});

router.get('/config', (req, res) => {
  res.json({
    code: 0,
    msg: 'success',
    data: {
      feishuConfigured: !!(config.feishu.appId && config.feishu.appSecret),
      dingtalkConfigured: !!(config.dingtalk.appId && config.dingtalk.appSecret)
    }
  });
});

module.exports = router;
