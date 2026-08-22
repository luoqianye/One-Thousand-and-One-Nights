    const chatArea = document.getElementById('chatArea');
    const userInput = document.getElementById('userInput');

    // ---- 对话功能区子导航（角色列表 / 动态 / 其他） ----
    let chatSub = 'rolelist';
    function switchChatSub(name) {
      chatSub = name;
      document.querySelectorAll('#chatView .chat-sub').forEach(el => el.classList.remove('active'));
      const target = document.getElementById('sub' + name.charAt(0).toUpperCase() + name.slice(1));
      if (target) target.classList.add('active');
      document.querySelectorAll('#chatView .subnav-item').forEach(b => b.classList.toggle('active', b.dataset.sub === name));
      if (name === 'rolelist') renderRoleList();
    }
    function renderRoleList() {
      const body = document.getElementById('roleListBody');
      if (!body) return;
      const all = [DEFAULT_CHAR, ...characters];
      body.innerHTML = all.map(c => {
        const isCurrent = c.id === currentCharId;
        const settingPreview = (c.setting || '').slice(0, 26) + ((c.setting || '').length > 26 ? '…' : '');
        return `
          <div class="char-card role-card" onclick="openChatDetail('${c.id}')">
            <div class="char-main">
              ${avatarHtml(c.avatar, 'char-avatar')}
              <div class="char-info">
                <div class="char-name">${escapeHtml(c.name)} ${isCurrent ? '<span class="char-current">使用中</span>' : ''}</div>
                <div class="char-meta">${escapeHtml(c.gender)} · ${escapeHtml(settingPreview)}</div>
              </div>
            </div>
          </div>`;
      }).join('');
    }
    // 从聊天详情/动态等子页跳转到功能区指定子层
    function goToChatSection(name) {
      pushView('chatView');
      switchChatSub(name);
    }
    // 从角色列表进入聊天详情
    function openChatDetail(id) {
      setCurrentChar(id);
      pushView('chatDetailView');
    }

    // ================= 聊天逻辑 =================
    // 默认角色设定（小鲸鱼）
    const SYSTEM_PROMPT = "你是一个名叫「小鲸鱼」的原创角色。你是一只肥嘟嘟的蓝色虎鲸，性格温柔、可爱，但很会倾听。你正在和你的创作者聊天。请用亲切的语气回复，每次回复不要太长，像真人聊天一样。";

    let messages = []; // 在 onload 时按当前角色初始化

    // 根据当前角色生成 system prompt
    function getSystemPrompt() {
      const c = getCurrentChar();
      if (c.id === 'default') return SYSTEM_PROMPT;
      return `你是一个名叫「${c.name}」的原创角色。性别：${c.gender}。人物设定：${c.setting}。你正在和你的创作者聊天。请用亲切的语气回复，每次回复不要太长，像真人聊天一样。`;
    }
    function initConversation() {
      const c = getCurrentChar();
      messages = [
        { role: "system", content: getSystemPrompt() },
        { role: "assistant", content: c.greeting || '你好呀，很高兴认识你~' }
      ];
      hintShown = false;
    }
    // 切换角色：重置对话（system prompt 已变，旧历史不再适用）
    function resetConversation() {
      initConversation();
      localStorage.removeItem(chatHistoryKey());
      renderAll();
      updateChatHeader();
      updateChatCard();
    }
    // 渲染聊天视图的角色列表（桌面侧栏 + 手机端横向条）
    function renderSideCharList() {
      const all = [DEFAULT_CHAR, ...characters];
      const side = document.getElementById('sideCharList');
      if (side) {
        side.innerHTML = all.map(c => `
          <button class="side-char-item ${c.id === currentCharId ? 'active' : ''}" onclick="setCurrentChar('${c.id}')">
            <span class="side-char-avatar">${avatarInner(c.avatar)}</span>
            <span class="side-char-name">${escapeHtml(c.name)}</span>
          </button>`).join('');
      }
      const strip = document.getElementById('charStrip');
      if (strip) {
        strip.innerHTML = all.map(c => `
          <button class="char-strip-item ${c.id === currentCharId ? 'active' : ''}" onclick="setCurrentChar('${c.id}')">
            <span class="strip-avatar">${avatarInner(c.avatar)}</span>
            <span class="strip-name">${escapeHtml(c.name)}</span>
          </button>`).join('');
      }
    }
    // 聊天视图：标题只显示当前角色名，刷新角色信息卡与角色列表高亮
    function updateChatHeader() {
      const c = getCurrentChar();
      const titleEl = document.getElementById('chatTitle');
      if (titleEl) titleEl.textContent = c.name;
      const ia = document.getElementById('infoAvatar');
      if (ia) ia.innerHTML = avatarInner(c.avatar);
      const inName = document.getElementById('infoName');
      if (inName) inName.textContent = c.name;
      const inGender = document.getElementById('infoGender');
      if (inGender) inGender.textContent = c.gender || '';
      const inSetting = document.getElementById('infoSetting');
      if (inSetting) inSetting.textContent = c.setting || '';
      renderSideCharList();
    }
    // 主界面对话聊天卡片显示当前角色
    function updateChatCard() {
      const c = getCurrentChar();
      const card = document.querySelector('.fun-card.f-chat .fun-desc');
      if (card) card.textContent = `和${c.name}聊天`;
    }

    // --- 保存对话到本地存储 ---
function chatHistoryKey() {
  return `tpm_chat_history_${currentCharId}`;
}

function saveMessages() {
  // 过滤掉系统消息（system prompt），只保存用户和助手的对话
  const toSave = messages.filter(m => m.role === 'user' || m.role === 'assistant');
  localStorage.setItem(chatHistoryKey(), JSON.stringify(toSave));
}

// --- 从本地存储加载对话 ---
function loadMessages() {
  let saved = localStorage.getItem(chatHistoryKey());
  if (!saved && currentCharId === 'default') {
    saved = localStorage.getItem('oc_chat_history');
    if (saved) localStorage.setItem(chatHistoryKey(), saved);
  }
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // 确保是数组，并且里面是有效消息
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 先把系统设定加到最前面（按当前角色生成）
        messages = [
          { role: "system", content: getSystemPrompt() },
          ...parsed
        ];
        // 把历史记录渲染到屏幕上
        renderAll();
        return true; // 表示加载成功
      }
    } catch(e) {
      console.error('读取聊天记录失败', e);
    }
  }
  return false; // 没有记录或读取失败
}
    
    function addBubble(text, role) {
      const bubble = document.createElement('div');
      bubble.className = 'bubble ' + (role === 'user' ? 'user' : 'oc');
      bubble.textContent = text;
      chatArea.appendChild(bubble);
      chatArea.scrollTop = chatArea.scrollHeight;
      return bubble;
    }

    // 是否正在生成回复（防止重复点击）
    let isGenerating = false;

    // 提示是否已显示过（只提示一次，不每条消息都提示）
    let hintShown = false;

    // 发送消息 / 触发 AI 回复：
    // - 输入框有内容 → 只把用户消息发出去，AI 不会立即回复
    // - 输入框空闲（空）→ 再点一次发送键，才调用 API 生成回复
    function send() {
      const text = userInput.value.trim();

      if (text) {
        // 有输入：只发送用户消息，不调用 API
        userInput.value = '';
        messages.push({ role: "user", content: text });
        saveMessages();
        renderAll();
        if (!hintShown) {
          hintShown = true;
          addHint('消息已发送 ~ 再点一次发送键让小鲸鱼回复你');
        }
        return;
      }

      // 输入框空闲：手动触发 AI 回复
      generateReply();
    }

    function addHint(text) {
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = text;
      chatArea.appendChild(hint);
      chatArea.scrollTop = chatArea.scrollHeight;
    }

    // ============ 气泡操作：长按 3 秒 / 鼠标右键 ============
    // bubbles 与 messages 中非 system 消息一一对应
    let bubbles = [];
    let bubbleMsgIndices = [];

    // 重新渲染整个聊天区（编辑/删除/加载后调用）
    function renderAll() {
      chatArea.innerHTML = '';
      bubbles = [];
      bubbleMsgIndices = [];
      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        if (m.role === 'system') continue;
        const b = addBubble(m.content, m.role === 'user' ? 'user' : 'oc');
        bubbles.push(b);
        bubbleMsgIndices.push(i);
        attachBubbleEvents(b);
      }
    }

    // 给气泡绑定：右键菜单 + 长按 3 秒菜单
    function attachBubbleEvents(bubble) {
      // 桌面端：鼠标右键
      bubble.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showMessageMenu(e.clientX, e.clientY, bubble);
      });

      // 移动端：长按 3 秒
      let pressTimer = null;
      bubble.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        const tx = t.clientX, ty = t.clientY;
        bubble.classList.add('press-hint');
        pressTimer = setTimeout(() => {
          bubble.classList.remove('press-hint');
          if (navigator.vibrate) navigator.vibrate(50); // 震动反馈
          showMessageMenu(tx, ty, bubble);
        }, 3000);
      }, { passive: true });

      const clearPress = () => {
        clearTimeout(pressTimer);
        bubble.classList.remove('press-hint');
      };
      bubble.addEventListener('touchend', clearPress);
      bubble.addEventListener('touchmove', clearPress);
      bubble.addEventListener('touchcancel', clearPress);
    }

    // 弹出气泡操作菜单
    function showMessageMenu(x, y, bubble) {
      const bi = bubbles.indexOf(bubble);
      if (bi < 0) return; // 临时气泡（如"..."）不弹菜单
      const mi = bubbleMsgIndices[bi];
      const msg = messages[mi];

      closeMessageMenu();
      const menu = document.createElement('div');
      menu.className = 'msg-menu';

      addMenuItem(menu, '编辑消息', () => editMessage(mi));
      addMenuItem(menu, '删除消息', () => deleteMessage(mi), true);
      // 只有 AI 回复（assistant）才允许"重新生成"
      if (msg.role === 'assistant') {
        addMenuItem(menu, '重新生成', () => regenerateMessage(mi));
      }

      document.body.appendChild(menu);

      // 定位（防止超出屏幕）
      const mw = menu.offsetWidth;
      const mh = menu.offsetHeight;
      let left = x, top = y;
      if (left + mw > window.innerWidth) left = window.innerWidth - mw - 8;
      if (top + mh > window.innerHeight) top = window.innerHeight - mh - 8;
      menu.style.left = left + 'px';
      menu.style.top = top + 'px';

      // 点击任意其他地方关闭菜单
      setTimeout(() => {
        document.addEventListener('click', closeMessageMenu, { once: true });
      }, 10);
    }

    function addMenuItem(menu, label, action, danger) {
      const item = document.createElement('div');
      item.className = 'msg-menu-item' + (danger ? ' danger' : '');
      item.textContent = label;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        action();
      });
      menu.appendChild(item);
    }

    function closeMessageMenu() {
      const old = document.querySelector('.msg-menu');
      if (old) old.remove();
    }

    // 编辑消息：气泡内联编辑，保存后截断后续对话（后续内容基于旧上下文）
    function editMessage(mi) {
      closeMessageMenu();
      const bi = bubbleMsgIndices.indexOf(mi);
      const bubble = bubbles[bi];
      if (!bubble) return;

      const msg = messages[mi];
      bubble.innerHTML = '';
      bubble.classList.add('editing');

      const ta = document.createElement('textarea');
      ta.className = 'edit-input';
      ta.value = msg.content;
      bubble.appendChild(ta);

      const btns = document.createElement('div');
      btns.className = 'edit-btns';
      const saveBtn = document.createElement('button');
      saveBtn.textContent = '✓ 保存';
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = '✗ 取消';
      btns.appendChild(saveBtn);
      btns.appendChild(cancelBtn);
      bubble.appendChild(btns);

      let finished = false;
      let onDocClick = null;

      const finish = (save) => {
        if (finished) return;
        finished = true;
        document.removeEventListener('click', onDocClick);
        bubble.classList.remove('editing');
        if (save) {
          const newText = ta.value.trim();
          if (newText) {
            // 编辑后，该消息之后的内容都基于旧上下文，一并截断
            messages.splice(mi + 1);
            msg.content = newText;
            saveMessages();
          }
        }
        renderAll();
      };

      onDocClick = (e) => {
        if (!bubble.contains(e.target)) finish(false);
      };

      saveBtn.onclick = () => finish(true);
      cancelBtn.onclick = () => finish(false);
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          finish(true);
        }
      });
      setTimeout(() => document.addEventListener('click', onDocClick), 10);

      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }

    // 删除消息：删除该消息及其后的所有消息（保持对话连贯）
    function deleteMessage(mi) {
      closeMessageMenu();
      messages.splice(mi);
      saveMessages();
      renderAll();
    }

    // 重新生成：删掉该回复及其后内容，立即重新调用 API
    function regenerateMessage(mi) {
      closeMessageMenu();
      messages.splice(mi);
      saveMessages();
      renderAll();
      generateReply();
    }

    async function generateReply() {
      if (isGenerating) return;
      // 没有任何用户消息时，不调用 API
      if (!messages.some(m => m.role === 'user')) return;

      isGenerating = true;

      // 显示“对方正在输入...”
      const typingBubble = addBubble('...', 'oc');

      try {
        const profile = getCurrentProfile();
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            // 前端"设置"里的配置优先，未填则由后端环境变量兜底
            baseUrl: profile?.apiKey ? profile.baseUrl : undefined,
            apiKey: profile?.apiKey || undefined,
            model: profile?.model || undefined
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          let message = `请求失败（HTTP ${response.status}）`;
          try {
            const parsed = JSON.parse(errorText);
            message = parsed.error?.message || parsed.error || message;
          } catch (e) {
            if (errorText.trim()) message = errorText.trim().slice(0, 300);
          }
          throw new Error(message);
        }

        // 处理流式输出
        if (!response.body) throw new Error('服务器没有返回可读取的数据流');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        typingBubble.textContent = '';
        let done = false;
        let buffer = '';

        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
          const lines = buffer.split(/\r?\n/);
          buffer = done ? '' : lines.pop();
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) typingBubble.textContent += content;
                chatArea.scrollTop = chatArea.scrollHeight;
              } catch (e) {}
            }
          }
        }

        // 记录完整的 AI 回复
        const fullReply = typingBubble.textContent.trim();
        if (!fullReply) throw new Error('模型返回了空回复');
        messages.push({ role: "assistant", content: fullReply });
        saveMessages(); // 保存到本地存储
        renderAll();
      } catch (err) {
        typingBubble.textContent = `出了点问题：${err.message}`;
        console.error(err);
      } finally {
        isGenerating = false;
      }
    }

    // 按回车发送
    userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') send();
    });

    // ============ 左右侧卡片视图切换（点击一次进入，再点一次返回） ============
    let sideView = 'info';
    function toggleSideView() {
      setSideView(sideView === 'info' ? 'list' : 'info');
    }
    function setSideView(view) {
      sideView = view;
      const infoView = document.getElementById('infoView');
      const listView = document.getElementById('listView');
      const btn = document.getElementById('sideSwitchBtn');
      if (infoView) infoView.style.display = view === 'info' ? 'flex' : 'none';
      if (listView) listView.style.display = view === 'list' ? 'flex' : 'none';
      if (btn) btn.textContent = view === 'list' ? '🐳 角色信息' : '👥 角色列表';
      if (view === 'list') renderSideCharList();
    }
    let statusView = 'status';
    function toggleStatusView() {
      setStatusView(statusView === 'status' ? 'settings' : 'status');
    }
    function setStatusView(view) {
      statusView = view;
      const sv = document.getElementById('statusView');
      const stv = document.getElementById('statusSettingsView');
      const btn = document.getElementById('statusSwitchBtn');
      if (sv) sv.style.display = view === 'status' ? 'flex' : 'none';
      if (stv) stv.style.display = view === 'settings' ? 'flex' : 'none';
      if (btn) btn.textContent = view === 'settings' ? '🎯 角色状态' : '⚙️ 角色设置';
    }

    // ============ 聊天输入区弹出菜单（仅 UI 展示） ============
    let chatPopupOpen = null;
    function toggleChatMenu(type) {
      const popup = document.getElementById('chatPopup');
      if (!popup) return;
      if (chatPopupOpen === type) {
        popup.style.display = 'none';
        chatPopupOpen = null;
        return;
      }
      chatPopupOpen = type;
      if (type === 'functions') {
        const items = [
          { icon: '📷', label: '图片' },
          { icon: '🧧', label: '红包' },
          { icon: '🎁', label: '礼物' },
          { icon: '🎤', label: '语音聊天' },
          { icon: '📍', label: '位置' }
        ];
        popup.innerHTML = '<div class="popup-title">聊天功能</div><div class="chat-popup-grid">' +
          items.map(i => `<button class="popup-item" onclick="showToast('「${i.label}」功能开发中，敬请期待~')"><span class="pi-icon">${i.icon}</span><span>${i.label}</span></button>`).join('') +
          '</div>';
      } else if (type === 'emoji') {
        popup.innerHTML = '<div class="popup-title">表情</div><div class="chat-popup-emoji">' +
          CHAR_EMOJIS.map(e => `<button onclick="insertEmoji('${e}')">${e}</button>`).join('') +
          '</div>';
      }
      popup.style.display = 'block';
    }
    function insertEmoji(emoji) {
      userInput.value += emoji;
      userInput.focus();
    }
    // 点击输入区外部关闭弹出菜单
    document.addEventListener('click', (e) => {
      if (chatPopupOpen && !e.target.closest('.input-wrap')) {
        const popup = document.getElementById('chatPopup');
        if (popup) popup.style.display = 'none';
        chatPopupOpen = null;
      }
    });
