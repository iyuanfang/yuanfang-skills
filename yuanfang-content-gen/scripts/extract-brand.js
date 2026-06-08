#!/usr/bin/env node
/**
 * extract-brand.js — 从 URL 提取品牌信息
 *
 * Usage:
 *   node scripts/extract-brand.js <url>
 *   node scripts/extract-brand.js https://aics.financialagent.cc/
 *
 * 输出 JSON: { domain, brand_name, primary_color, secondary_color, source }
 *   - brand_name: 域名主标签首字母大写（aics → AICS）
 *   - primary_color: 基于品牌名 hash 在 5 色调色板里选
 *   - source: 完整 URL
 *
 * Exit code 0 = 成功
 */

const crypto = require('crypto');

const PALETTE = [
  { name: 'indigo',  hex: '#4F46E5' },
  { name: 'emerald', hex: '#059669' },
  { name: 'rose',    hex: '#E11D48' },
  { name: 'amber',   hex: '#D97706' },
  { name: 'slate',   hex: '#475569' },
];

function pickColor(brandName) {
  const hash = crypto.createHash('md5').update(brandName).digest();
  let sum = 0;
  for (const b of hash) sum = (sum + b) | 0;
  return PALETTE[Math.abs(sum) % PALETTE.length];
}

function extractBrandName(host) {
  const parts = host.split('.');
  const main = parts[0];
  if (main.length <= 4) return main.toUpperCase();
  return main.charAt(0).toUpperCase() + main.slice(1);
}

function extract(urlStr) {
  const url = new URL(urlStr);
  const domain = url.hostname.replace(/^www\./, '');
  const brand_name = extractBrandName(domain);
  const primary = pickColor(brand_name);
  return {
    domain,
    brand_name,
    primary_color: primary.hex,
    primary_name: primary.name,
    source: urlStr.replace(/\/$/, ''),
  };
}

const url = process.argv[2];
if (!url) {
  console.error('Usage: node extract-brand.js <url>');
  process.exit(1);
}

try {
  const result = extract(url);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
