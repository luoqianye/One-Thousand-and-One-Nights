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

  const apiKey = body.apiKey || env.OPENAI_API_KEY;
  const baseUrl = (body.baseUrl || env.API_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/+$/, '');

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
