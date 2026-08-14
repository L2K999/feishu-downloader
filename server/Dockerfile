FROM node:16-alpine

WORKDIR /app

# 复制 package 文件并安装依赖（构建上下文为 server/ 目录）
COPY package*.json ./
RUN npm install --production

# 复制后端代码
COPY . ./

# 创建必要目录
RUN mkdir -p downloads data

# 暴露端口（云托管会自动注入 PORT 环境变量）
EXPOSE 80

# 环境变量
ENV NODE_ENV=production
ENV PORT=80

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:80/api/health || exit 1

# 启动服务
CMD ["node", "server.js"]
