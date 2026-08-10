// 这个文件是后端代理，保护你的 API Key 不暴露到前端
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求' });
  }

  const { messages } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.API_BASE_URL || 'https://api.openai.com/v1';

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
        model: 'deepseek-v4-flash',   // 模型名字可按你用的 API 改
        messages,
        stream: true,
        temperature: 0.7,
      })
    });

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
