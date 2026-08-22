// ================= 角色管理（人设卡） =================
const CHAR_EMOJIS = ['🐳', '🦊', '🐱', '🐰', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐙', '🐉', '🦄', '🐺', '🐧', '🦉'];
const DEFAULT_CHAR = {
  id: 'default', avatar: '🐳', name: '小鲸鱼', gender: '保密',
  setting: '一只肥嘟嘟的蓝色虎鲸，性格温柔、可爱，但很会倾听。',
  greeting: '你好呀，我是小鲸鱼。很高兴能和你聊天~ 今天想聊什么呢？'
};
let characters = [];
let currentCharId = 'default';
let editingCharId = null;

function loadCharacters() {
  try { characters = JSON.parse(localStorage.getItem('tpm_characters')) || []; } catch (e) { characters = []; }
  try { currentCharId = localStorage.getItem('tpm_current_char') || 'default'; } catch (e) {}
}
function saveCharacters() { localStorage.setItem('tpm_characters', JSON.stringify(characters)); }
function getChar(id) {
  if (id === 'default') return DEFAULT_CHAR;
  return characters.find(c => c.id === id) || null;
}
function getCurrentChar() { return getChar(currentCharId) || DEFAULT_CHAR; }

function renderCharacters() {
  const list = document.getElementById('charList');
  list.innerHTML = '';
  const all = [DEFAULT_CHAR, ...characters];
  for (const c of all) {
    const isCurrent = c.id === currentCharId;
    const card = document.createElement('div');
    card.className = 'char-card';
    const settingPreview = (c.setting || '').slice(0, 18) + ((c.setting || '').length > 18 ? '…' : '');
    let actions = '';
    if (c.id !== 'default') {
      actions += `<button class="char-btn" onclick="editChar('${c.id}')">编辑</button>`;
      actions += `<button class="char-btn" style="color:#e64340" onclick="deleteChar('${c.id}')">删除</button>`;
    }
    if (!isCurrent) {
      actions += `<button class="char-btn" style="background:#07c160;color:#fff" onclick="setCurrentChar('${c.id}')">使用</button>`;
    }
    card.innerHTML = `
      <div class="char-main">
        ${avatarHtml(c.avatar, 'char-avatar')}
        <div class="char-info">
          <div class="char-name">${escapeHtml(c.name)} ${isCurrent ? '<span class="char-current">使用中</span>' : ''}</div>
          <div class="char-meta">${escapeHtml(c.gender)} · ${escapeHtml(settingPreview)}</div>
        </div>
      </div>
      ${actions ? `<div class="char-actions">${actions}</div>` : ''}`;
    list.appendChild(card);
  }
}

// 头像编辑状态：emoji 或 custom（dataURL / 图床 URL）
let avatarState = 'emoji';
let avatarData = '🐳';

function openCharEditor(id) {
  editingCharId = id || null;
  const c = id ? getChar(id) : { avatar: '🐳', name: '', gender: '保密', setting: '', greeting: '' };
  document.getElementById('charModalTitle').textContent = id ? '编辑角色' : '新建角色';
  document.getElementById('charName').value = c.name || '';
  document.getElementById('charGender').value = c.gender || '保密';
  document.getElementById('charSetting').value = c.setting || '';
  document.getElementById('charGreeting').value = c.greeting || '';
  // 头像初始化：识别是图片还是 emoji
  const av = c.avatar || '🐳';
  const isImg = av.startsWith('data:') || av.startsWith('http');
  avatarState = isImg ? 'custom' : 'emoji';
  avatarData = av;
  document.getElementById('charAvatarUrl').value = (isImg && av.startsWith('http')) ? av : '';
  document.getElementById('emojiGrid').style.display = 'none';
  renderEmojiGrid(avatarState === 'emoji' ? av : '🐳');
  updateAvatarPreview();
  document.getElementById('charModal').style.display = 'flex';
}
function closeCharEditor() { document.getElementById('charModal').style.display = 'none'; }
function editChar(id) { openCharEditor(id); }

// 头像三种来源：emoji / 本地上传 / 图床 URL
function updateAvatarPreview() {
  const pv = document.getElementById('charAvatarPreview');
  const source = safeImageSource(avatarData);
  if (avatarState === 'custom' && source) {
    pv.textContent = '';
    const img = document.createElement('img');
    img.src = source;
    img.alt = '';
    pv.appendChild(img);
  }
  else pv.textContent = avatarData || '🐳';
}
function toggleEmojiPicker() {
  const grid = document.getElementById('emojiGrid');
  grid.style.display = grid.style.display === 'grid' ? 'none' : 'grid';
}
function onAvatarUrlInput() {
  const url = document.getElementById('charAvatarUrl').value.trim();
  if (url) {
    avatarState = 'custom';
    avatarData = url;
    document.getElementById('emojiGrid').style.display = 'none';
    updateAvatarPreview();
  }
}
async function handleAvatarFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  try {
    const dataUrl = await fileToCompressedDataUrl(file);
    avatarState = 'custom';
    avatarData = dataUrl;
    document.getElementById('charAvatarUrl').value = '';
    document.getElementById('emojiGrid').style.display = 'none';
    updateAvatarPreview();
    showToast('头像已更新');
  } catch (e) {
    showToast('图片处理失败：' + e.message);
  } finally {
    input.value = '';
  }
}
// 压缩图片为小尺寸 dataURL（避免撑爆 localStorage）
function fileToCompressedDataUrl(file, maxSize = 256, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (!w || !h) return reject(new Error('图片尺寸无效'));
        if (w > h && w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; }
        else if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('图片读取失败'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}
// 渲染头像（emoji 文本 或 图片）
function avatarHtml(avatar, cls) {
  const source = safeImageSource(avatar);
  if (source) {
    return `<div class="${cls}" style="overflow:hidden"><img src="${escapeHtml(source)}" alt=""></div>`;
  }
  return `<div class="${cls}">${escapeHtml(avatar || '🐳')}</div>`;
}

function renderEmojiGrid(selected) {
  const grid = document.getElementById('emojiGrid');
  grid.innerHTML = '';
  for (const e of CHAR_EMOJIS) {
    const el = document.createElement('div');
    el.className = 'emoji-opt' + (e === selected ? ' selected' : '');
    el.textContent = e;
    el.onclick = () => {
      grid.querySelectorAll('.emoji-opt').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      avatarState = 'emoji';
      avatarData = el.textContent;
      document.getElementById('charAvatarUrl').value = '';
      updateAvatarPreview();
      grid.style.display = 'none';
    };
    grid.appendChild(el);
  }
}

function saveChar() {
  const name = document.getElementById('charName').value.trim();
  if (!name) { showToast('请填写角色名称'); return; }
  const data = {
    avatar: avatarData || '🐳',
    name,
    gender: document.getElementById('charGender').value,
    setting: document.getElementById('charSetting').value.trim(),
    greeting: document.getElementById('charGreeting').value.trim()
  };
  if (editingCharId) {
    Object.assign(getChar(editingCharId), data);
    showToast('角色已更新');
  } else {
    const id = 'c' + Date.now();
    characters.push({ id, ...data });
    if (characters.length === 1) {
      currentCharId = id;
      localStorage.setItem('tpm_current_char', id);
    }
    showToast('角色已创建');
  }
  saveCharacters();
  closeCharEditor();
  renderCharacters();
}

function deleteChar(id) {
  if (!confirm('确定删除该角色吗？')) return;
  characters = characters.filter(c => c.id !== id);
  if (currentCharId === id) { currentCharId = 'default'; localStorage.setItem('tpm_current_char', 'default'); }
  saveCharacters();
  renderCharacters();
  showToast('角色已删除');
}

function setCurrentChar(id) {
  currentCharId = id;
  localStorage.setItem('tpm_current_char', id);
  initConversation();
  if (!loadMessages()) renderAll();
  updateChatHeader();
  updateChatCard();
  renderCharacters();
  renderSideCharList();
  showToast(`已切换到「${getChar(id).name}」`);
}

function allRoles() { return [DEFAULT_CHAR, ...characters]; }

// 头像内部内容（图片或 emoji），用于 span 容器
function avatarInner(avatar) {
  const source = safeImageSource(avatar);
  if (source) return `<img src="${escapeHtml(source)}" alt="">`;
  return escapeHtml(avatar || '🐳');
}
