    // ================= 视图切换（支持浏览器/手机返回键） =================
    let currentViewId = 'homeView';
    let pendingChatSub = null;
    const viewParents = {
      chatView: 'homeView',
      momentsView: 'chatView',
      chatDetailView: 'chatView',
      settingsView: 'homeView',
      apiConfigView: 'settingsView',
      charactersView: 'homeView',
      memoirView: 'homeView',
      bookView: 'memoirView'
    };

    function showView(id) {
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      const view = document.getElementById(id) || document.getElementById('homeView');
      view.classList.add('active');
      currentViewId = view.id;
      document.body.classList.toggle('workspace-mode', view.classList.contains('workspace-view'));
    }
    function pushView(id) {
      showView(id);
      history.pushState({ v: id }, '');
    }
    // 页面里的返回按钮：弹窗优先关闭，否则退到当前页面的上一级。
    function goBack() {
      closeMessageMenu();
      const charModal = document.getElementById('charModal');
      const configModal = document.getElementById('configModal');
      if (charModal?.style.display !== 'none') { closeCharEditor(); return; }
      if (configModal?.style.display !== 'none') { closeProfileEditor(); return; }
      if (currentViewId === 'homeView') return;
      history.back();
    }

    // 浏览器/手机返回键：优先采用历史记录中的页面；没有记录时按父级关系回退。
    window.addEventListener('popstate', (event) => {
      const charModal = document.getElementById('charModal');
      const configModal = document.getElementById('configModal');
      if (charModal?.style.display !== 'none' || configModal?.style.display !== 'none') {
        if (charModal?.style.display !== 'none') closeCharEditor();
        if (configModal?.style.display !== 'none') closeProfileEditor();
        history.pushState({ v: currentViewId }, '');
        return;
      }
      const target = event.state?.v || viewParents[currentViewId] || 'homeView';
      showView(target);
      if (target === 'chatView' && pendingChatSub) {
        const sub = pendingChatSub;
        pendingChatSub = null;
        switchChatSub(sub);
      }
    });

    // 给初始页面建立明确状态，确保第一层和第二层返回行为一致。
    history.replaceState({ v: 'homeView' }, '');

    function openChat() { pushView('chatView'); switchChatSub('rolelist'); renderRoleList(); }
    function openSettings() { pushView('settingsView'); updateApiStatusText(); }
    function openApiConfig() { pushView('apiConfigView'); renderProfiles(); }
    function openCharacters() { pushView('charactersView'); renderCharacters(); }
    function openMoments() { pushView('momentsView'); renderMoments(); }
    // 动态页只允许返回对话功能区，不进入任何角色的聊天详情。
    function returnToChatView() {
      if (currentViewId !== 'momentsView') return;
      pendingChatSub = 'rolelist';
      history.back();
    }
    function returnToChatSection(name) {
      if (currentViewId !== 'momentsView') return;
      pendingChatSub = name;
      history.back();
    }
