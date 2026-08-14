# 云文档下载器 (Cloud Doc Downloader)

一个微信小程序，支持从飞书、钉钉、Notion、语雀、腾讯文档、Google Docs 等云文档平台下载文档，支持导出为 Word、PDF、Markdown 等格式。

## 功能特性

- 📝 **多平台支持**：飞书、钉钉、Notion、语雀、腾讯文档、Google Docs
- 📄 **多格式导出**：Word (.docx)、PDF (.pdf)、Markdown (.md)、Excel (.xlsx)、HTML、CSV
- 🔄 **批量下载**：支持一次提交多个链接，批量处理
- 💾 **本地保存**：下载的文件保存到手机本地
- 📜 **历史记录**：查看和管理下载历史

## 项目结构

```
feishu_down/
├── miniprogram/          # 微信小程序前端
│   ├── pages/           # 页面
│   │   ├── index/       # 首页（链接输入）
│   │   └── history/     # 历史记录
│   ├── utils/           # 工具函数（含多平台 URL 解析、统一 API 调度）
│   ├── app.js           # 小程序入口
│   └── app.json         # 小程序配置
├── server/              # Node.js 后端服务
│   ├── services/        # API 服务（飞书、钉钉、Notion、语雀、腾讯文档、Google Docs）
│   ├── routes/          # API 路由（6 个平台）
│   ├── downloads/       # 文件存储目录
│   └── server.js        # 服务入口
└── README.md
```

## 快速开始

### 1. 后端服务配置

```bash
cd server

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的飞书/钉钉应用凭证

# 启动服务
npm start
```

### 2. 飞书开放平台配置

1. 访问 [飞书开放平台](https://open.feishu.cn/) 创建企业自建应用
2. 在「权限管理」中开通以下权限：
   - `drive:drive:readonly` - 查看、评论和下载云空间中所有文件
   - `docs:doc:readonly` - 查看新版文档
   - `docs:doc:export` - 导出云文档
3. 获取 App ID 和 App Secret，填入 `.env` 文件

### 3. 钉钉开放平台配置

1. 访问 [钉钉开放平台](https://open-dev.dingtalk.com/) 创建企业应用
2. 开通文档相关 API 权限
3. 获取 App Key 和 App Secret，填入 `.env` 文件

### 4. Notion 配置

1. 访问 [Notion Integrations](https://www.notion.com/my-integrations) 创建 Integration
2. 复制 Internal Integration Secret
3. 在 Notion 文档中点击「...」->「Connections」-> 添加你的 Integration
4. 将 API Key 填入 `.env` 文件的 `NOTION_API_KEY`

### 5. 语雀配置

1. 登录语雀，访问个人设置获取 API Token
2. 在浏览器开发者工具中获取 `authToken` 和 `csrfToken`（从请求头中）
3. 将 Token 填入 `.env` 文件

### 6. 腾讯文档配置

1. 访问 [腾讯文档开放平台](https://docs.qq.com/open/) 注册应用
2. 获取 AppID 和 App Secret
3. 将凭证填入 `.env` 文件
4. 注意：每用户每天限调用 9 次导出

### 7. Google Docs 配置

1. 访问 [Google Cloud Console](https://console.cloud.google.com/) 创建项目
2. 启用 Google Drive API 和 Google Docs API
3. 创建 OAuth 2.0 凭证，获取 Client ID 和 Client Secret
4. 将凭证填入 `.env` 文件
5. 公开文档无需认证即可导出

### 8. 微信小程序配置

1. 使用微信开发者工具打开 `miniprogram` 目录
2. 在 `project.config.json` 中配置你的小程序 AppID
3. 在小程序的「设置」->「后端设置」中填入后端服务地址
4. 在微信公众平台配置后端服务器域名白名单

## API 接口

### 飞书相关接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/feishu/export` | 创建导出任务 |
| GET | `/api/feishu/export/result/:taskId` | 查询导出结果 |
| GET | `/api/feishu/markdown/:token` | 获取 Markdown 内容 |
| POST | `/api/feishu/batch-export` | 批量导出 |
| GET | `/api/feishu/batch-result/:batchId` | 查询批量结果 |
| POST | `/api/feishu/save-file` | 保存文件 |
| GET | `/api/feishu/download/:fileId` | 下载文件 |

### 钉钉相关接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/dingtalk/export` | 创建导出任务 |
| GET | `/api/dingtalk/export/result/:taskId` | 查询导出结果 |
| POST | `/api/dingtalk/save-file` | 保存文件 |
| GET | `/api/dingtalk/download/:fileId` | 下载文件 |

### Notion 相关接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/notion/export` | 导出页面为 Markdown |
| GET | `/api/notion/markdown/:pageId` | 获取页面 Markdown 内容 |
| GET | `/api/notion/page/:pageId` | 获取页面信息 |
| POST | `/api/notion/search` | 搜索页面 |
| GET | `/api/notion/download/:fileId` | 下载文件 |

### 语雀相关接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/yuque/export` | 导出文档 |
| GET | `/api/yuque/markdown/:namespace/:slug` | 获取文档 Markdown |
| GET | `/api/yuque/docs/:namespace` | 获取知识库文档列表 |
| POST | `/api/yuque/batch-export` | 批量导出知识库 |
| GET | `/api/yuque/download/:fileId` | 下载文件 |

### 腾讯文档相关接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/tencent/export` | 异步导出文档 |
| GET | `/api/tencent/export/result/:fileId/:operationId` | 查询导出进度 |
| GET | `/api/tencent/file/:fileId` | 获取文档信息 |
| GET | `/api/tencent/download/:fileId` | 下载文件 |

### Google Docs 相关接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/google/export` | 导出 Google 文档 |
| GET | `/api/google/direct-url/:docId` | 获取直接下载链接 |
| GET | `/api/google/formats/:docType` | 获取支持的格式 |
| GET | `/api/google/download/:fileId` | 下载文件 |

## 支持的平台

| 平台 | 状态 | 支持格式 | 认证方式 |
|------|------|----------|----------|
| 飞书 | ✅ 已支持 | Word, PDF, Markdown, Excel | App ID + Secret |
| 钉钉 | ✅ 已支持 | Word, PDF, Excel | App Key + Secret |
| Notion | ✅ 已支持 | Markdown, PDF*, HTML* | API Key (Integration Token) |
| 语雀 | ✅ 已支持 | Markdown, HTML, PDF* | Auth Token + CSRF Token |
| 腾讯文档 | ✅ 已支持 | Word, PDF, Excel, CSV, Markdown | AppID + Secret |
| Google Docs | ✅ 已支持 | PDF, Word, Markdown, Excel, HTML, TXT | API Key / OAuth 2.0 |

> \* 标记格式需下载后转换，平台 API 原生不支持

## 注意事项

1. **服务器域名**：微信小程序要求后端服务必须使用 HTTPS，并在小程序后台配置域名白名单
2. **飞书权限**：需要在飞书文档页面将文档分享给自建应用，应用才能访问
3. **Notion 权限**：需要在 Notion 文档中手动将 Integration 添加到页面
4. **腾讯文档限制**：每用户每天限调用 9 次导出
5. **Google Docs**：公开文档可直接导出无需认证；私有文档需 OAuth 授权
6. **频率限制**：各平台 API 均有频率限制，批量导出时请控制并发数量
7. **文件大小**：小程序单个文件保存限制为 100MB

## 开发说明

### 本地开发

```bash
# 启动后端开发服务器（自动重启）
cd server
npm run dev

# 使用微信开发者工具打开 miniprogram 目录
# 后端地址设置为 http://localhost:3000
```

### 生产部署

1. 将后端服务部署到云服务器（推荐使用 Nginx + PM2）
2. 配置 SSL 证书，确保 HTTPS 访问
3. 在微信公众平台配置服务器域名

## License

MIT License
