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

function assertSafeBaseUrl(value) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (url.protocol !== 'https:') throw new Error('Base URL 必须使用 HTTPS');
  if (url.username || url.password) throw new Error('Base URL 不能包含用户名或密码');
  if (host === 'localhost' || host.endsWith('.localhost') || host === '::1' || host === '0.0.0.0') throw new Error('Base URL 不能指向本机地址');
  if (/^(?:10|127)\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) throw new Error('Base URL 不能指向内网地址');
  const match172 = host.match(/^172\.(\d+)\./);
  if (match172 && Number(match172[1]) >= 16 && Number(match172[1]) <= 31) throw new Error('Base URL 不能指向内网地址');
}
