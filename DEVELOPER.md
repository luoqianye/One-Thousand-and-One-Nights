# DEVELOPER.md · 千页忆境开发规范

> 本文件是项目的「施工图纸」。任何功能修改必须在**对应子区**内进行，禁止在 index.html 中堆叠新逻辑。
> 修改任何模块前，先读本文件确认「哪个功能归哪个模块」。

---

## 一、总览：一个壳 + 九个子区

```
index.html（291 行，纯 HTML + 资源引用，无内联 JS）
├── assets/css/    9 个文件（布局壳 + 各功能区样式）
└── assets/js/     10 个文件（工具 + 各功能区逻辑 + 导航 + 启动）
```

**铁律：功能归属子区。** 改聊天 → chat.*；改动态 → moments.*；改回忆录 → memoir.*；改角色 → characters.*；改设置 → settings.*；改主界面 → home.css；改导航 → navigation.js。

---

## 二、index.html 视图地图（哪个 id 是哪个功能）

每个 `<section class="view">` = 一个子区。**HTML 结构只在 index.html 里加，但逻辑绝不写进 index.html。**

| 视图 id | 功能 | 类标记 | 入口函数 |
|---------|------|--------|---------|
| `homeView` | 主界面（时钟 + 8 功能区卡片） | — | 卡片 onclick |
| `chatView` | 对话功能区（角色列表/其他 子层） | `workspace-view` | `openChat()` |
| `momentsView` | 动态 | `workspace-view` | `openMoments()` |
| `chatDetailView` | 聊天详情（气泡/输入框） | `workspace-view` | `openChatDetail(id)` |
| `settingsView` | 设置列表 | — | `openSettings()` |
| `apiConfigView` | API 配置 | — | `openApiConfig()` |
| `charactersView` | 角色档案 | — | `openCharacters()` |
| `memoirView` | 回忆录书架 | — | `openMemoir()` |
| `bookView` | 阅读器 | — | `openBook(id)` |

**弹窗（modal）**：`charModal`（角色编辑）、`configModal`（API 配置编辑）

**布局提示**：
- `workspace-view` 类 = 该视图使用独立近全屏工作区（`body.workspace-mode` 由 navigation.js 自动切换），不继承首页 920px 中央卡片
- 普通视图（设置/角色/回忆录等）保持首页卡片壳

---

## 三、JS 模块职责与依赖（10 个文件）

| 文件 | 职责 | 关键全局符号 | 被谁依赖 |
|------|------|-------------|---------|
| `assets/js/core/utils.js` | 安全工具 | `escapeHtml` / `safeImageSource` | 所有模块 |
| `assets/js/core/ui.js` | 轻提示 | `showToast` | 所有模块 |
| `assets/js/core/clock.js` | 顶部时钟 | `updateClock` | 自动运行 |
| `assets/js/features/settings.js` | 设置 + API 配置 + 模型选择器 | `settings` / `getCurrentProfile` / `updateModelSelect` | chat.js |
| `assets/js/features/characters.js` | 角色档案 + 头像 | `characters` / `currentCharId` / `DEFAULT_CHAR` / `getChar` / `setCurrentChar` / `allRoles` / `avatarHtml` / `avatarInner` / `fileToCompressedDataUrl` | chat / moments / memoir |
| `assets/js/features/moments.js` | 动态 | `moments` / `momentFilterChar` / `renderMoments` / `SAMPLE_MOMENTS` | — |
| `assets/js/features/memoir.js` | 回忆录 + 阅读器 | `books` / `currentBookId` / `renderShelf` / `renderBookReader` / `turnPage` / `SAMPLE_BOOKS` | — |
| `assets/js/features/chat.js` | 聊天 + 功能区子导航 | `messages` / `send` / `generateReply` / `renderAll` / `chatHistoryKey` / `switchChatSub` / `renderRoleList` | bootstrap.js |
| `assets/js/core/navigation.js` | 视图切换 + 返回 + 入口函数 | `viewParents` / `currentViewId` / `pushView` / `goBack` / `popstate` / `openChat` / `openSettings` / `openMoments` | 全局 |
| `assets/js/bootstrap.js` | 启动初始化 | `window.onload` | 必须最后加载 |

**跨模块全局符号（新模块可直接使用，无需重复定义）**：
`escapeHtml` · `safeImageSource` · `showToast` · `getChar` · `allRoles` · `avatarInner` · `avatarHtml` · `getCurrentProfile` · `pushView` · `goBack` · `currentViewId` · `setCurrentChar`

---

## 四、CSS 模块（改样式找对应文件）

| 文件 | 负责区域 |
|------|---------|
| `assets/css/base.css` | 基础：`*` / `body` / `.app`（920px 卡片壳） |
| `assets/css/shell.css` | 视图切换 `.view` / `body.workspace-mode` 工作区 |
| `assets/css/components.css` | 通用：`.page-header` / `.sub-body` |
| `assets/css/features/home.css` | 主界面：时钟 / `.fun-grid` / 功能区卡片 |
| `assets/css/features/chat.css` | 聊天 + 功能区：侧栏 / 气泡 / 子导航 / toast / `fadeIn` |
| `assets/css/features/settings.css` | 设置列表 / 表单 / 按钮 |
| `assets/css/features/characters.css` | 角色卡 / modal / emoji / 头像 |
| `assets/css/features/moments.css` | 动态：筛选 chips / 便签墙 / 手机单列流 |
| `assets/css/features/memoir.css` | 书架 / 书封 / 双页单页阅读器 |

---

## 五、新功能开发标准流程（创建新子区）

```
① HTML    index.html 加 <section id="xxxView" class="view">（需要全屏加 workspace-view）
          主界面 fun-grid 加对应卡片：<button class="fun-card fN f-xxx" onclick="openXxx()">
② CSS     新建 assets/css/features/xxx.css → head 加 <link rel="stylesheet">
③ JS      新建 assets/js/features/xxx.js → 加 <script src="assets/js/features/xxx.js">
          入口函数 openXxx() 写在本模块内（pushView('xxxView') + 渲染）
④ 导航    viewParents 加映射：xxxView: 'homeView'（或父视图 id）
⑤ 数据    localStorage key 用 tpm_xxx 前缀；示例数据仅内存展示，绝不写入 localStorage
⑥ 安全    用户输入一律 escapeHtml；图片源一律 safeImageSource
```

---

## 六、⚠️ 加载顺序红线（script 引用顺序 = 依赖顺序）

```
core/utils.js → core/ui.js → core/clock.js
→ features/settings.js → characters.js → moments.js → memoir.js → chat.js
→ core/navigation.js
→ bootstrap.js（永远最后）
```

- 新模块 JS 必须插在 **navigation.js 之前**
- 新增 script 引用后，跑一次语法检查：`node --check 文件路径`

---

## 七、数据存储约定（localStorage）

| key | 数据 | 模块 |
|-----|------|------|
| `tpm_characters` / `tpm_current_char` | 角色列表 / 当前角色 | characters.js |
| `tpm_settings` | API 配置 profiles | settings.js |
| `tpm_chat_history_{charId}` | 每个角色的聊天历史 | chat.js |
| `oc_chat_history` | 旧版历史（迁移兼容） | chat.js |
| `tpm_moments` | 动态 | moments.js |
| `tpm_books` | 回忆录书籍 | memoir.js |

---

## 八、常见修改入口速查

| 想改什么 | 去哪里改 |
|---------|---------|
| 聊天气泡/发送/回复/历史 | `features/chat.js` + `features/chat.css` |
| 角色列表/新建/头像 | `features/characters.js` + `characters.css` + `index.html#charModal` |
| 动态便签/筛选 | `features/moments.js` + `moments.css` + `index.html#momentsView` |
| 书架/阅读器/翻页 | `features/memoir.js` + `memoir.css` + `index.html#bookView` |
| API 配置/模型 | `features/settings.js` + `settings.css` + `index.html#configModal` |
| 主界面卡片/时钟 | `index.html#homeView` + `features/home.css` |
| 返回/视图切换/入口 | `core/navigation.js`（viewParents 在这里） |
| 启动初始化 | `bootstrap.js` |
| 安全工具/toast | `core/utils.js` / `core/ui.js` |
