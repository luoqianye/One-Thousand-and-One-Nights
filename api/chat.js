// 这个文件是后端代理，保护你的 API Key 不暴露到前端
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求' });
  }

  const body = req.body || {};
  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 200) {
    return res.status(400).json({ error: 'messages 必须是包含 1 到 200 条消息的数组' });
  }
  if (messages.some(message => !message || !['system', 'user', 'assistant'].includes(message.role) || typeof message.content !== 'string')) {
    return res.status(400).json({ error: 'messages 中包含无效消息' });
  }
  if (JSON.stringify(messages).length > 500000) {
    return res.status(413).json({ error: '对话内容过长，请精简后重试' });
  }
  // 前端"设置"里填的 baseUrl/apiKey/model 优先，其次用环境变量兜底
  const clientApiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
  const clientBaseUrl = typeof body.baseUrl === 'string' ? body.baseUrl.trim() : '';
  if (clientBaseUrl && !clientApiKey) {
    return res.status(400).json({ error: '使用自定义 Base URL 时必须同时提供对应的 API Key' });
  }
  const apiKey = clientApiKey || process.env.OPENAI_API_KEY;
  const baseUrl = (clientBaseUrl || process.env.API_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
  try {
    assertSafeBaseUrl(baseUrl);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  // 模型名做成可配置：默认 deepseek-chat（DeepSeek 官方对话模型名）
  // 注意：deepseek-v4-flash 不是 DeepSeek 官方模型名，调用官方 API 会 400 报错
  const model = body.model || process.env.MODEL || 'deepseek-chat';

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key 未配置，请在 Vercel 环境变量中设置 OPENAI_API_KEY' });
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,   // 默认 deepseek-chat，可用环境变量 MODEL 覆盖
        messages,
        stream: true,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).send(errText || JSON.stringify({ error: `上游 API 错误（HTTP ${response.status}）` }));
    }

    // 将流式响应直接管道给前端
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: streamDone } = await reader.read();
      done = streamDone;
      if (value) {
        const chunk = decoder.decode(value, { stream: !done });
        res.write(chunk);
      }
    }
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function assertSafeBaseUrl(value) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (url.protocol !== 'https:') throw new Error('Base URL 必须使用 HTTPS');
  if (url.username || url.password) throw new Error('Base URL 不能包含用户名或密码');
  if (host === 'localhost' || host.endsWith('.localhost') || host === '::1' || host === '0.0.0.0') {
    throw new Error('Base URL 不能指向本机地址');
  }
  if (/^(?:10|127)\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) {
    throw new Error('Base URL 不能指向内网地址');
  }
  const match172 = host.match(/^172\.(\d+)\./);
  if (match172 && Number(match172[1]) >= 16 && Number(match172[1]) <= 31) {
    throw new Error('Base URL 不能指向内网地址');
  }
}
