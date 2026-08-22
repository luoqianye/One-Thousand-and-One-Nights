    // ================= 动态（moments） =================
    // 开发用示例动态：仅在无正式数据时用于展示骨架，不会写入 localStorage
    const SAMPLE_MOMENTS = [
      { id: 's1', charId: 'default', content: '今天傍晚的海边，贝壳在唱歌…… 我数了数，有七种声音！', images: [], createdAt: Date.now() - 86400000 * 3, style: { variant: 'note', rotation: 'r' } },
      { id: 's2', charId: 'default', content: '给月亮写了封信，它回信说：明晚见。', images: [], createdAt: Date.now() - 86400000 * 2, style: { variant: 'wide', rotation: 'l' } },
      { id: 's3', charId: 'default', content: '路过小镇的糖果铺，老板送了我一颗星星糖。舍不得吃，先放进宝库。', images: [], createdAt: Date.now() - 86400000, style: { variant: 'square', rotation: 'r' } },
      { id: 's4', charId: 'default', content: '今晚的夜空很适合讲故事。你愿意来听吗？', images: [], createdAt: Date.now() - 3600000 * 6, style: { variant: 'note', rotation: 'l' } }
    ];
    let moments = [];
    let momentFilterChar = 'all'; // 动态筛选：'all' 或角色 id（默认全部角色，不与聊天当前角色强绑定）

    function loadMoments() {
      // 正式数据优先；无正式数据时用示例数据（仅内存展示，不写入 localStorage）
      try {
        const saved = localStorage.getItem('tpm_moments');
        if (saved) { moments = JSON.parse(saved); return; }
      } catch (e) {}
      moments = SAMPLE_MOMENTS.slice();
    }
    function saveMoments() { localStorage.setItem('tpm_moments', JSON.stringify(moments)); }
    function momentAuthor(charId) {
      return getChar(charId) || { id: charId, avatar: '👻', name: '已离开的角色' };
    }

    function renderMoments() {
      loadMoments();
      renderMomentFilter();
      const wall = document.getElementById('momentsWall');
      const list = moments
        .filter(m => momentFilterChar === 'all' || m.charId === momentFilterChar)
        .slice().sort((a, b) => b.createdAt - a.createdAt);
      if (!list.length) {
        wall.innerHTML = '<div class="moments-empty">这里还没有动态，晚点再来看看吧~</div>';
        return;
      }
      wall.innerHTML = list.map(momentCardHTML).join('');
    }
    function renderMomentFilter() {
      const strip = document.getElementById('momentFilter');
      const roles = allRoles();
      const chips = [{ id: 'all', avatar: '✨', name: '全部' }, ...roles.map(c => ({ id: c.id, avatar: c.avatar, name: c.name }))];
      strip.innerHTML = chips.map(c => `
        <button class="filter-chip ${momentFilterChar === c.id ? 'active' : ''}" onclick="momentFilterChar='${c.id}';renderMoments();">
          <span class="chip-avatar">${avatarInner(c.avatar)}</span>
          <span>${escapeHtml(c.name)}</span>
        </button>`).join('');
    }
    function momentCardHTML(m) {
      const author = momentAuthor(m.charId);
      const variant = (m.style && m.style.variant) || 'note';
      const rotation = (m.style && m.style.rotation) === 'l' ? 'rot-l' : 'rot-r';
      const imgs = (m.images || []).map(src => safeImageSource(src)).filter(Boolean)
        .map(src => `<img src="${escapeHtml(src)}" alt="">`).join('');
      const d = new Date(m.createdAt);
      const dateStr = `${d.getMonth() + 1}月${d.getDate()}日`;
      return `
        <div class="moment-note ${variant} ${rotation}">
          <div class="note-tape"></div>
          <div class="note-text">${escapeHtml(m.content)}</div>
          ${imgs ? `<div class="note-imgs">${imgs}</div>` : ''}
          <div class="note-meta">
            <span class="note-author">
              <span class="na-avatar">${avatarInner(author.avatar)}</span>
              <span>${escapeHtml(author.name)}</span>
            </span>
            <span>${dateStr}</span>
          </div>
        </div>`;
    }
