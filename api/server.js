// Vercel Serverless Function 入口
// 文档: https://vercel.com/docs/functions/runtimes/node-js

process.env.VERCEL = '1';

// 加载 Express 应用
const app = require('../server/server.js');

// Vercel 需要导出一个 handler 函数
// @vercel/node 会自动处理 req/res
module.exports = app;
