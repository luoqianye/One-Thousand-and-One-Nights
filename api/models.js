// ============================================================
// Vercel 版：拉取模型列表接口（/api/models）
// 供前端"设置 → API 配置 → 拉取模型"使用。
// 请求体：{ baseUrl?, apiKey? } —— 优先用前端填的，其次环境变量
// ============================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求' });
  }

  const body = req.body || {};
  const apiKey = body.apiKey || process.env.OPENAI_API_KEY;
  const baseUrl = (body.baseUrl || process.env.API_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/+$/, '');

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key 未配置，请在设置中填写，或在 Vercel 环境变量中设置 OPENAI_API_KEY' });
  }

  try {
    const upstream = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(upstream.status).send(errText || JSON.stringify({ error: `上游 API 错误（HTTP ${upstream.status}）` }));
    }

    const data = await upstream.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
