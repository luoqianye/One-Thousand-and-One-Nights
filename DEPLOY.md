# 部署指南：迁移到腾讯云 EdgeOne Pages（免费 · 国内直连 · 无需备案）

## 为什么要迁移

当前项目部署在 **Vercel**，但 `*.vercel.app` 域名在国内被 DNS 污染/封锁：

- 浏览器 → Vercel（页面 + /api/chat）经常超时失败 ❌
- 而 DeepSeek 官方 API 国内可以直连 ✅

**腾讯云 EdgeOne Pages** 是"国内版 Vercel"：静态托管 + 边缘函数（Serverless 后端代理），国内节点访问快，使用平台自带域名 **不需要备案**，有免费额度，个人使用完全够。

---

## 项目结构（迁移后）

```
Thousand-Pages-Memory/
├── index.html          # 页面（无需改动，/api/chat 相对路径自动指向边缘函数）
├── functions/
│   └── api/
│       └── chat.js     # 边缘函数代理（新增，已就位）
├── api/
│   └── chat.js         # Vercel 版代理（已修正模型名，可保留作 Vercel 备份）
└── DEPLOY.md
```

---

## 部署步骤（约 5 分钟）

### 1. 前置准备
- 注册[腾讯云账号](https://cloud.tencent.com/)（微信扫码即可）
- 项目已推送到 GitHub（你的仓库：`luoqianye/Thousand-Pages-Memory`）
- 在 [DeepSeek 开放平台](https://platform.deepseek.com/) 申请 API Key（`sk-...` 开头）

### 2. 创建 EdgeOne Pages 项目
1. 打开 [EdgeOne Pages 控制台](https://console.cloud.tencent.com/edgeone/pages)
2. 点击 **创建项目** → 选择 **从 GitHub 导入仓库**
3. 授权 GitHub，选择 `Thousand-Pages-Memory` 仓库
4. **构建配置**：
   - 框架预设：无（纯静态）
   - 构建命令：留空
   - 输出目录：填 `.`（仓库根目录）
   - 部署分支：`main`
5. 点击 **保存并部署**

> 部署后你会得到一个 `https://xxx.edgeone.app` 域名，国内可直接访问。

### 3. 配置环境变量

控制台 → 你的项目 → **设置 → 环境变量**，添加：

| 变量名 | 必填 | 值 |
|--------|------|-----|
| `OPENAI_API_KEY` | ✅ | 你的 DeepSeek API Key（`sk-...`） |
| `API_BASE_URL` | 可选 | 默认 `https://api.deepseek.com/v1` |
| `MODEL` | 可选 | 默认 `deepseek-chat` |

添加后点击 **重新部署** 使环境变量生效。

### 4. 验证
- 浏览器打开你的 `xxx.edgeone.app` 域名 → 应能看到小鲸鱼聊天界面
- 发一条消息（此时 AI 不回复，符合新功能设计）
- **输入框留空再点一次发送** → 应出现"正在输入..."并流式回复

---

## 常见问题排查

| 现象 | 原因 | 解决 |
|------|------|------|
| 回复框显示"出错了：..." | 前端 `fetch('/api/chat')` 失败 | 确认访问的是 EdgeOne 域名而非 Vercel 域名 |
| 报错含 `model not found` / 400 | 模型名不是 DeepSeek 官方名 | 环境变量 `MODEL` 设为 `deepseek-chat` |
| 报错含 401 / authentication | API Key 错误 | 检查 `OPENAI_API_KEY` 是否为 `sk-` 开头且未有多余空格 |
| 报错含 402 | DeepSeek 账户余额不足 | 去 DeepSeek 开放平台充值 |
| 环境变量改了没生效 | 未重新部署 | 改完环境变量后点"重新部署" |

---

## 备选方案（如果暂时不迁移）

- **继续用 Vercel**：至少把模型名修好（代码已默认 `deepseek-chat`），但国内访问不稳的问题依旧存在，只适合偶尔自测。
- **本机自测**：`api/chat.js` 是标准 Node 函数，可用 `vercel dev` 或任意 Node serverless 框架本地跑通逻辑，再决定部署位置。
