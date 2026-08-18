// ============================================================
// EdgeOne Pages 版后端代理（腾讯云，国内可直接访问，无需备案）
// 路由：/api/chat（本文件位于 functions/api/chat.js，路径即路由）
//
// 部署到 EdgeOne Pages 后，前端 index.html 里的 fetch('/api/chat')
// 相对路径会自动指向本函数，前端代码无需任何改动。
//
// 环境变量（在 EdgeOne Pages 控制台 → 项目 → 环境变量 中配置）：
//   OPENAI_API_KEY  必填，你的 DeepSeek API Key
//   API_BASE_URL    可选，默认 https://api.deepseek.com/v1
//   MODEL           可选，默认 deepseek-chat（DeepSeek 官方对话模型）
// ============================================================

export async function onRequestPost(context) {
  const { request, env } = context;

  // 解析请求体（前端"设置"里填的 baseUrl/apiKey/model 优先，其次用环境变量兜底）
  let messages;
  let body = {};
  try {
    body = await request.json();
    messages = body.messages;
    if (!Array.isArray(messages)) throw new Error('messages 不是数组');
  } catch (e) {
    return new Response(
      JSON.stringify({ error: '请求体格式错误: ' + e.message }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const apiKey = body.apiKey || env.OPENAI_API_KEY;
  const baseUrl = (body.baseUrl || env.API_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
  const model = body.model || env.MODEL || 'deepseek-chat';

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API Key 未配置，请在设置中填写，或在平台环境变量中设置 OPENAI_API_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  try {
    // 转发到 DeepSeek（OpenAI 兼容接口，支持流式）
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.7,
      })
    });

    // 上游报错时把错误信息原样透传给前端（方便排查：401 Key 错误 / 400 模型名错误 / 402 余额不足）
    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(
        errText || JSON.stringify({ error: `上游 API 错误（HTTP ${upstream.status}）` }),
        { status: upstream.status, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // 流式透传（SSE）
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
