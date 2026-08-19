// ============================================================
// EdgeOne Pages 版：拉取模型列表接口（/api/models）
// 供前端"设置 → API 配置 → 拉取模型"使用。
// 请求体：{ baseUrl?, apiKey? } —— 优先用前端填的，其次环境变量
// ============================================================

export async function onRequestPost(context) {
  const { request, env } = context;

  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: '请求体格式错误: ' + e.message }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const clientApiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
  const clientBaseUrl = typeof body.baseUrl === 'string' ? body.baseUrl.trim() : '';
  if (clientBaseUrl && !clientApiKey) {
    return new Response(JSON.stringify({ error: '使用自定义 Base URL 时必须同时提供对应的 API Key' }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
  const apiKey = clientApiKey || env.OPENAI_API_KEY;
  const baseUrl = (clientBaseUrl || env.API_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
  try {
    assertSafeBaseUrl(baseUrl);
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API Key 未配置，请在设置中填写，或在平台环境变量中设置 OPENAI_API_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  try {
    // OpenAI 兼容的 /models 接口
    const upstream = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(
        errText || JSON.stringify({ error: `上游 API 错误（HTTP ${upstream.status}）` }),
        { status: upstream.status, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const data = await upstream.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
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
