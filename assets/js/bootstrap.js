    // 启动时初始化
    window.onload = () => {
      loadSettings();
      loadCharacters();
      if (!messages.length) initConversation();
      // 尝试从本地存储加载历史，如果没有才显示默认欢迎语
      if (!loadMessages()) {
        renderAll();
      }
      updateChatHeader();
      updateChatCard();
    };
