// ================= 设置管理（多 API 配置） =================
let settings = { profiles: [], currentProfileId: null };

function defaultProfile() {
  return {
    id: 'p' + Date.now(),
    name: '默认配置',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    models: [],
    model: 'deepseek-chat'
  };
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('tpm_settings'));
    if (s && Array.isArray(s.profiles)) {
      settings = { profiles: s.profiles, currentProfileId: s.currentProfileId };
    } else if (s && typeof s === 'object' && s.baseUrl) {
      // 旧版单配置自动迁移为 profiles[0]
      const p = defaultProfile();
      p.baseUrl = s.baseUrl || p.baseUrl;
      p.apiKey = s.apiKey || '';
      p.model = s.model || p.model;
      settings = { profiles: [p], currentProfileId: p.id };
      saveSettings();
    }
  } catch (e) {}
  if (!settings.profiles.length) {
    const p = defaultProfile();
    settings = { profiles: [p], currentProfileId: p.id };
    saveSettings();
  }
  if (!settings.currentProfileId) settings.currentProfileId = settings.profiles[0].id;
}
function saveSettings() {
  localStorage.setItem('tpm_settings', JSON.stringify(settings));
  updateApiStatusText();
  updateModelSelect();
}
function getCurrentProfile() {
  return settings.profiles.find(p => p.id === settings.currentProfileId) || settings.profiles[0] || null;
}
function updateApiStatusText() {
  const el = document.getElementById('apiStatusText');
  if (el) {
    const p = getCurrentProfile();
    el.textContent = p ? `${p.name} · ${p.model || '未选模型'}` : '未配置';
  }
}
function setCfgStatus(text) {
  document.getElementById('apiCfgStatus').textContent = text;
}

// ---- API 配置列表 ----
function renderProfiles() {
  const list = document.getElementById('profileList');
  list.innerHTML = '';
  if (!settings.profiles.length) {
    list.innerHTML = '<div style="color:#999;font-size:13px;text-align:center;padding:20px">还没有配置，点右上角「+ 添加」</div>';
    return;
  }
  for (const p of settings.profiles) {
    const isCurrent = p.id === settings.currentProfileId;
    const card = document.createElement('div');
    card.className = 'char-card';
    card.innerHTML = `
      <div class="char-main">
        <div class="char-avatar" style="background:#e8f9ef">🔌</div>
        <div class="char-info">
          <div class="char-name">${escapeHtml(p.name)} ${isCurrent ? '<span class="char-current">使用中</span>' : ''}</div>
          <div class="char-meta">${escapeHtml(p.baseUrl)} · ${escapeHtml(p.model || '未选模型')}</div>
        </div>
      </div>
      <div class="char-actions">
        <button class="char-btn" onclick="openProfileEditor('${p.id}')">编辑</button>
        ${settings.profiles.length > 1 ? `<button class="char-btn" style="color:#e64340" onclick="deleteProfile('${p.id}')">删除</button>` : ''}
        ${isCurrent ? '' : `<button class="char-btn" style="background:#07c160;color:#fff" onclick="setCurrentProfile('${p.id}')">使用</button>`}
      </div>`;
    list.appendChild(card);
  }
}

let editingProfileId = null;
function openProfileEditor(id) {
  editingProfileId = id || null;
  const p = id ? settings.profiles.find(x => x.id === id) : defaultProfile();
  if (!p) return;
  document.getElementById('configModalTitle').textContent = id ? '编辑 API 配置' : '添加 API 配置';
  document.getElementById('cfgName').value = p.name || '';
  document.getElementById('cfgBaseUrl').value = p.baseUrl || 'https://api.deepseek.com/v1';
  document.getElementById('cfgApiKey').value = p.apiKey || '';
  const sel = document.getElementById('cfgModel');
  sel.innerHTML = p.models && p.models.length
    ? p.models.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('')
    : '<option value="">（先拉取模型）</option>';
  sel._models = Array.isArray(p.models) ? [...p.models] : [];
  if (p.model && Array.isArray(p.models) && p.models.includes(p.model)) sel.value = p.model;
  document.getElementById('apiCfgStatus').textContent = '';
  document.getElementById('configModal').style.display = 'flex';
}
function closeProfileEditor() { document.getElementById('configModal').style.display = 'none'; }

async function fetchModels() {
  const baseUrl = document.getElementById('cfgBaseUrl').value.trim();
  const apiKey = document.getElementById('cfgApiKey').value.trim();
  setCfgStatus('正在拉取模型...');
  try {
    const res = await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl, apiKey })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const models = (data.data || []).map(m => m.id).filter(Boolean);
    const sel = document.getElementById('cfgModel');
    sel.innerHTML = models.length
      ? models.map(id => `<option value="${escapeHtml(id)}">${escapeHtml(id)}</option>`).join('')
      : '<option value="">（无可用模型）</option>';
    sel._models = models;
    setCfgStatus(`✅ 拉取成功，发现 ${models.length} 个模型`);
    return models;
  } catch (e) {
    setCfgStatus('❌ 拉取失败：' + e.message);
    return [];
  }
}

async function testConnection() {
  setCfgStatus('正在测试连接...');
  try {
    const res = await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl: document.getElementById('cfgBaseUrl').value.trim(),
        apiKey: document.getElementById('cfgApiKey').value.trim()
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    setCfgStatus(`✅ 连接成功！发现 ${(data.data || []).length} 个模型`);
  } catch (e) {
    setCfgStatus('❌ 连接失败：' + e.message);
  }
}

function saveProfile() {
  const name = document.getElementById('cfgName').value.trim();
  const baseUrl = document.getElementById('cfgBaseUrl').value.trim();
  const apiKey = document.getElementById('cfgApiKey').value.trim();
  const model = document.getElementById('cfgModel').value;
  if (!name) { showToast('请填写配置名称'); return; }
  if (!baseUrl) { showToast('请填写 Base URL'); return; }
  const modelSelect = document.getElementById('cfgModel');
  const models = Array.isArray(modelSelect._models) ? modelSelect._models : [];
  const data = { name, baseUrl, apiKey, model, models };
  if (editingProfileId) {
    const p = settings.profiles.find(x => x.id === editingProfileId);
    if (p) { Object.assign(p, data); showToast('配置已更新'); }
  } else {
    const p = defaultProfile();
    Object.assign(p, data);
    settings.profiles.push(p);
    if (settings.profiles.length === 1) settings.currentProfileId = p.id;
    showToast('配置已添加');
  }
  saveSettings();
  closeProfileEditor();
  renderProfiles();
}
function deleteProfile(id) {
  if (!confirm('确定删除该配置吗？')) return;
  settings.profiles = settings.profiles.filter(p => p.id !== id);
  if (settings.currentProfileId === id) settings.currentProfileId = settings.profiles[0]?.id || null;
  saveSettings();
  renderProfiles();
  showToast('配置已删除');
}
function setCurrentProfile(id) {
  settings.currentProfileId = id;
  saveSettings();
  renderProfiles();
  showToast('已切换 API 配置');
}

// ---- 聊天模型选择器 ----
function updateModelSelect() {
  const sel = document.getElementById('chatModelSelect');
  if (!sel) return;
  const options = [];
  for (const p of settings.profiles) {
    if (p.models && p.models.length) {
      for (const m of p.models) options.push({ label: `${p.name} / ${m}`, value: p.id + '||' + m });
    } else {
      options.push({ label: `${p.name} / ${p.model || '未选模型'}`, value: p.id + '||' + (p.model || '') });
    }
  }
  if (!options.length) {
    sel.innerHTML = '<option value="">（请先在设置中配置 API）</option>';
    return;
  }
  sel.innerHTML = options.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('');
  const cur = getCurrentProfile();
  const curVal = cur ? cur.id + '||' + (cur.model || '') : '';
  if (curVal && options.some(o => o.value === curVal)) sel.value = curVal;
  else sel.selectedIndex = 0;
}
function onChatModelChange(sel) {
  const parts = sel.value.split('||');
  if (parts.length < 2) return;
  const pid = parts[0], model = parts[1];
  const p = settings.profiles.find(x => x.id === pid);
  if (p) {
    settings.currentProfileId = pid;
    if (model) p.model = model;
    saveSettings();
    showToast(`已选择 ${p.name} / ${model}`);
  }
}
