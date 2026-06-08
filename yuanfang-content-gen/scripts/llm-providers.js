const fs = require('fs');
const path = require('path');

function getEnvApiKey(name) {
  return process.env[name] || process.env[name.replace('_API_KEY', '_KEY')] || '';
}

function detectProvider() {
  if (getEnvApiKey('OPENAI_API_KEY'))    return 'openai';
  if (getEnvApiKey('ANTHROPIC_API_KEY')) return 'anthropic';
  return 'template';
}

const TEMPLATE_PROVIDER = {
  name: 'template',
  async complete({ prompt }) {
    let parsed;
    try {
      parsed = JSON.parse(prompt);
    } catch (e) {
      throw new Error('template provider: prompt must be JSON-encoded request');
    }
    return renderTemplateCopy(parsed);
  },
};

function pickTitleVariant(titleFormula, facts) {
  const t = (facts.title || '').trim();
  if (!titleFormula || titleFormula.length === 0) return t || '推荐一款好用的产品';
  const idx = simpleHash(t) % titleFormula.length;
  return applyTitleFormula(titleFormula[idx], facts);
}

function applyTitleFormula(formula, facts) {
  let out = formula;
  const numMatch = (facts.body || '').match(/\d+/);
  const num = numMatch ? numMatch[0] : '3';
  out = out.replace(/\{数字\}/g, num);
  out = out.replace(/\{产品\}/g, facts.brand_name || 'AICS');
  out = out.replace(/\{品类\}/g, facts.category || 'AI 工具');
  out = out.replace(/\{痛点\}/g, facts.pain_point || '运营难题');
  out = out.replace(/\{解决方式\}/g, '一键解决');
  out = out.replace(/\{解决\}/g, '彻底解决');
  out = out.replace(/\{目标用户\}/g, '中小企业');
  out = out.replace(/\{年限\}/g, '10');
  out = out.replace(/\{话题\}/g, '智能客服选型');
  out = out.replace(/\{属性\}/g, '关键能力');
  out = out.replace(/\{数字个属性\}/g, '3 个关键能力');
  out = out.replace(/\{方案A\}/g, '传统客服');
  out = out.replace(/\{方案B\}/g, 'AI 客服');
  out = out.replace(/\{新观点\}/g, '用 AI 把成本打下来');
  out = out.replace(/\{错误认知\}/g, '客服只能靠人力');
  out = out.replace(/\{反常识\}/g, 'AI 客服比人工更靠谱');
  out = out.replace(/\{数字维度\}/g, '3 维度');
  out = out.replace(/\{数字个真相\}/g, '3 个真相');
  out = out.replace(/\{数字个最扎心\}/g, '第 1 个最扎心');
  out = out.replace(/\{单位\}/g, '家');
  out = out.replace(/\{动作\}/g, '中小企业');
  out = out.replace(/\{结果\}/g, '降本 60%');
  out = out.replace(/\{行业\}/g, '客服行业');
  out = out.replace(/\{剧变\}/g, '大变革');
  out = out.replace(/\{领域\}/g, 'AI 客服');
  out = out.replace(/\{深层原因\}/g, '技术拐点到了');
  out = out.replace(/\{群体\}/g, '中小企业');
  out = out.replace(/\{影响\}/g, '吞噬');
  out = out.replace(/\{潜规则\}/g, '潜规则');
  out = out.replace(/\{最震惊\}/g, '最扎心');
  out = out.replace(/\{情绪词\}/g, '真的没想到');
  out = out.replace(/\{错误做法\}/g, '挑灯夜战');
  if (/\{[^}]+\}/.test(out)) {
    out = out.replace(/\{[^}]+\}/g, (m) => {
      const inner = m.slice(1, -1);
      const known = { '数字个{常见认知}': `${num} 个常见认知` };
      return known[inner] || m.slice(1, -1);
    });
  }
  return out;
}

function simpleHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function renderTemplateCopy(req) {
  const { platform, title_formula, facts, variant = 0 } = req;
  const title = pickTitleVariant(title_formula, facts);

  const angles = ['experience', 'painpoint', 'curiosity'];
  const angle = angles[variant % angles.length];

  let opener, mid, closer;
  if (angle === 'experience') {
    opener = `说出来你可能不信，${facts.lead_in || '我刚刚体验了一款' + (facts.brand_name || '新产品')}`;
    mid = `它最戳我的是——${facts.point1 || '设计真的懂用户'}`;
    closer = `${facts.cta || '感兴趣的可以试试看'}。`;
  } else if (angle === 'painpoint') {
    opener = `以前 ${facts.pain || '做这事'} 总是很费劲，${facts.lead_in || '直到我发现了' + (facts.brand_name || '这个')}`;
    mid = `它能解决的是——${facts.point1 || '真正省时间'}`;
    closer = `${facts.cta || '推荐有需要的人试试'}。`;
  } else {
    opener = `一直没留意到 ${facts.category || '这类'} 还能这样玩，${facts.lead_in || '直到朋友安利了' + (facts.brand_name || '这个')}`;
    mid = `最让我意外的是——${facts.point1 || '很多细节做到位了'}`;
    closer = `${facts.cta || '可以了解一下'}。`;
  }

  const body = `${opener}。${mid}。${facts.point2 ? facts.point2 + '。' : ''}${closer}`;

  const out = { title, cta: facts.cta || '立即了解', body };

  if (platform === 'moments') {
    out.text = `试了个${facts.brand_name || '新产品'}，${facts.point1 || '还不错'}。${facts.cta || '推荐'}。`;
    delete out.body;
  }

  if (platform === 'xiaohongshu') {
    out.tags = ['AI工具', facts.category || '效率神器', '干货分享'].filter(Boolean);
  }
  if (['xiaohongshu', 'toutiao', 'zhihu', 'weibo-micro'].includes(platform)) {
    out.points = [facts.point1, facts.point2, facts.point3].filter(Boolean);
  }
  if (platform === 'wechat') {
    out.lead = `${opener}。${mid}。\n\n听完他的账，我意识到：${facts.brand_name || '这件事'}的拐点，可能比所有人预想得更近。`;
    out.outline = [facts.point1, facts.point2, facts.point3].filter(Boolean);
  }
  if (platform === 'zhihu') {
    out.key_points = [facts.point1, facts.point2, facts.point3].filter(Boolean);
  }
  if (platform === 'toutiao') {
    out.meta = `${facts.brand_name || '这款产品'} 把 ${facts.category || '智能客服'} 门槛打到 0 元。`;
  }
  return JSON.stringify(out);
}

async function openaiComplete({ system, prompt, maxTokens = 2000, model }) {
  const apiKey = getEnvApiKey('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  const useModel = model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: useModel,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.8,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`openai ${res.status}: ${t}`);
  }
  const j = await res.json();
  return j.choices?.[0]?.message?.content || '';
}

async function anthropicComplete({ system, prompt, maxTokens = 2000, model }) {
  const apiKey = getEnvApiKey('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const useModel = model || process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: useModel,
      max_tokens: maxTokens,
      system: system || '',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`anthropic ${res.status}: ${t}`);
  }
  const j = await res.json();
  return j.content?.[0]?.text || '';
}

function getProvider(opts = {}) {
  const name = opts.name || process.env.CONTENT_GEN_LLM || detectProvider();
  switch (name) {
    case 'openai':    return { name, complete: openaiComplete };
    case 'anthropic': return { name, complete: anthropicComplete };
    case 'template':  return TEMPLATE_PROVIDER;
    default:
      throw new Error(`unknown LLM provider: ${name}. valid: template, openai, anthropic`);
  }
}

module.exports = { getProvider, detectProvider, TEMPLATE_PROVIDER, openaiComplete, anthropicComplete };
