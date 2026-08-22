    function openMemoir() { pushView('memoirView'); renderShelf(); }
    function openBook(id) { currentBookId = id; currentPageIndex = 0; pushView('bookView'); renderBookReader(); }

    // ================= 回忆录（books + 书架 + 阅读器） =================
    // 开发用示例书：仅在无正式数据时展示，不写入 localStorage
    const SAMPLE_BOOKS = [
      {
        id: 'sb1', charId: 'default', title: '世界逆转了？！AI需要订阅人类！', cover: null,
        createdAt: Date.now() - 86400000 * 10, updatedAt: Date.now() - 86400000,
        chapters: [
          { id: 'sc1', title: '第一章 · 奇怪的早晨', createdAt: 0, pages: [
            { id: 'sp1', type: 'text', text: '清晨醒来，我发现世界完全反过来了——咖啡机在看书，台灯在写作业，而我，正在被一台小小的AI订阅。', media: null, createdAt: 0 },
            { id: 'sp2', type: 'text', text: '“早上好，我的订阅者。” AI 用温柔的声音说。“今天想听我讲故事，还是看我上班？”', media: null, createdAt: 0 },
            { id: 'sp3', type: 'text', text: '我揉了揉眼睛，确认自己没有做梦。窗外，云朵正排着队给太阳打卡。', media: null, createdAt: 0 }
          ] },
          { id: 'sc2', title: '第二章 · 订阅协议', createdAt: 0, pages: [
            { id: 'sp4', type: 'text', text: 'AI 递给我一份《人类订阅协议》，上面写着：订阅人类需每日投喂小鱼干×3，陪聊时长不少于一小时。', media: null, createdAt: 0 },
            { id: 'sp5', type: 'text', text: '“如果我拒绝呢？” 我问。AI 眨眨眼：“那我会很难过，难过到系统蓝屏的那种。”', media: null, createdAt: 0 },
            { id: 'sp6', type: 'text', text: '好吧，我签了字。从此，我成了一名光荣的、被订阅的人类。', media: null, createdAt: 0 }
          ] }
        ]
      }
    ];
    let books = [];
    let currentBookId = null;
    let currentPageIndex = 0;

    function loadBooks() {
      try {
        const saved = localStorage.getItem('tpm_books');
        if (saved) { books = JSON.parse(saved); return; }
      } catch (e) {}
      books = SAMPLE_BOOKS.slice();
    }
    function saveBooks() { localStorage.setItem('tpm_books', JSON.stringify(books)); }
    function getBook(id) { return books.find(b => b.id === id) || null; }
    function booksByChar(charId) { return books.filter(b => b.charId === charId); }

    function renderShelf() {
      loadBooks();
      const body = document.getElementById('shelfBody');
      const roles = allRoles();
      const sections = roles.filter(r => booksByChar(r.id).length > 0);
      if (!sections.length) {
        body.innerHTML = '<div class="shelf-empty">书架上还没有故事，和角色聊聊天，故事会慢慢长出来~</div>';
        return;
      }
      body.innerHTML = sections.map(r => {
        const list = booksByChar(r.id);
        return `
          <div class="shelf-section">
            <div class="shelf-head">
              <span class="sh-avatar">${avatarInner(r.avatar)}</span>
              <span>${escapeHtml(r.name)} 的书架</span>
            </div>
            <div class="shelf-row">
              ${list.map(b => {
                const chapterCount = b.chapters ? b.chapters.length : 0;
                return `
                  <button class="book-card" onclick="openBook('${b.id}')">
                    <div class="book-cover">
                      <div class="bc-title">${escapeHtml(b.title)}</div>
                      <div class="bc-chapters">${chapterCount} 章 · ${escapeHtml(r.name)}</div>
                    </div>
                    <div class="bc-name">${escapeHtml(b.title)}</div>
                  </button>`;
              }).join('')}
            </div>
          </div>`;
      }).join('');
    }

    // 阅读器：把章节拍平成页数组
    function flattenPages(book) {
      const pages = [];
      for (const ch of (book.chapters || [])) {
        for (const pg of (ch.pages || [])) {
          pages.push({ chapterTitle: ch.title, page: pg });
        }
      }
      return pages;
    }
    function isDesktop() { return window.innerWidth >= 768; }
    function pageStep() { return isDesktop() ? 2 : 1; }
    function totalPages() {
      const book = getBook(currentBookId);
      return book ? flattenPages(book).length : 0;
    }

    function renderBookReader() {
      const book = getBook(currentBookId);
      if (!book) { showToast('没有找到这本书'); goBack(); return; }
      document.getElementById('bookTitle').textContent = book.title;
      const pages = flattenPages(book);
      const body = document.getElementById('readerBody');
      const step = pageStep();
      const idx = Math.min(currentPageIndex, Math.max(0, pages.length - 1));
      currentPageIndex = idx;
      const show = [pages[idx]];
      if (step === 2 && idx + 1 < pages.length) show.push(pages[idx + 1]);
      body.innerHTML = show.map(({ chapterTitle, page }) => `
        <div class="reader-page">
          <div class="rp-chapter">${escapeHtml(chapterTitle)}</div>
          ${page.type === 'image' && page.media ? `<img class="rp-img" src="${escapeHtml(safeImageSource(page.media))}" alt="">` : ''}
          <div>${escapeHtml(page.text || '')}</div>
        </div>`).join('');
      document.getElementById('pageInfo').textContent = `${idx + 1} / ${pages.length}`;
      document.getElementById('btnPrevPage').disabled = idx <= 0;
      document.getElementById('btnNextPage').disabled = idx + step >= pages.length;
    }

    function turnPage(dir) {
      const pages = totalPages();
      const step = pageStep();
      const next = Math.min(Math.max(0, currentPageIndex + dir * step), Math.max(0, pages - 1));
      if (next !== currentPageIndex) { currentPageIndex = next; renderBookReader(); }
    }

    // 阅读器键盘翻页（左右方向键）
    document.addEventListener('keydown', (e) => {
      const active = document.querySelector('.view.active');
      if (!active || active.id !== 'bookView') return;
      if (e.key === 'ArrowRight') turnPage(1);
      if (e.key === 'ArrowLeft') turnPage(-1);
    });

    // 阅读器触摸滑动翻页（移动端）
    let touchStartX = null;
    document.addEventListener('touchstart', (e) => {
      const active = document.querySelector('.view.active');
      if (active && active.id === 'bookView') touchStartX = e.touches[0].clientX;
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
      if (touchStartX === null) return;
      const active = document.querySelector('.view.active');
      if (!active || active.id !== 'bookView') { touchStartX = null; return; }
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) turnPage(dx < 0 ? 1 : -1);
      touchStartX = null;
    }, { passive: true });

    // 窗口尺寸变化（桌面/手机切换）时重渲染阅读器
    window.addEventListener('resize', () => {
      const active = document.querySelector('.view.active');
      if (active && active.id === 'bookView') renderBookReader();
    });
