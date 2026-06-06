#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { getMetaContent, getLinkHref, extractFromHtml } = require('./extract.js');

const CACHE_DIR = path.join(process.cwd(), '.yuanfang', 'brand-specs');
const TTL_DAYS = 7;

const ENTRY_PREFIXES = ['www.', 'm.', 'mobile.', 'app.'];

function extractDomain(url) {
  try {
    let host = new URL(url).hostname.toLowerCase();
    for (const p of ENTRY_PREFIXES) {
      if (host.startsWith(p)) {
        host = host.slice(p.length);
        break;
      }
    }
    return host;
  } catch {
    return null;
  }
}

function resolveImageAsDataUrl(url) {
  return fetch(url, {
    headers: { 'User-Agent': 'yuanfang-skills/0.1' },
    redirect: 'follow',
  })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return Promise.all([r.arrayBuffer(), r.headers.get('content-type')]);
    })
    .then(([buf, ct]) => {
      const mime = ct || 'image/png';
      return `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
    });
}

function extractBrandFromHtml(html, url) {
  const domain = extractDomain(url);
  const siteName = getMetaContent(html, 'site_name');
  const ogImage = getMetaContent(html, 'image');
  const appleIcon = getLinkHref(html, 'apple-touch-icon')
    || getLinkHref(html, 'apple-touch-icon-precomposed')
    || getLinkHref(html, 'icon');
  const themeColor = getMetaContent(html, 'theme-color');

  let logoUrl = null;
  if (ogImage) {
    logoUrl = ogImage.startsWith('http') ? ogImage : new URL(ogImage, url).href;
  } else if (appleIcon) {
    logoUrl = appleIcon.startsWith('http') ? appleIcon : new URL(appleIcon, url).href;
  }

  return {
    domain,
    url,
    name: siteName || domain,
    logo: null,
    logoUrl,
    colors: {
      primary: themeColor || null,
    },
  };
}

async function fetchBrand(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'yuanfang-skills/0.1' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const html = await res.text();
  const brand = extractBrandFromHtml(html, url);
  if (brand.logoUrl) {
    try {
      brand.logo = await resolveImageAsDataUrl(brand.logoUrl);
    } catch (e) {
      process.stderr.write(`warn: failed to download logo (${e.message})\n`);
    }
  }
  return brand;
}

function cachePath(domain) {
  return path.join(CACHE_DIR, `${domain}.json`);
}

function readCache(domain) {
  const p = cachePath(domain);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function isExpired(spec) {
  if (!spec.extractedAt) return true;
  const ageMs = Date.now() - new Date(spec.extractedAt).getTime();
  return ageMs > TTL_DAYS * 24 * 60 * 60 * 1000;
}

function writeCache(spec) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const p = cachePath(spec.domain);
  fs.writeFileSync(p, JSON.stringify(spec, null, 2) + '\n');
  return p;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const forceRefresh = args.includes('--refresh-brand');
  const remaining = args.filter(a => a !== '--refresh-brand');
  if (remaining.length === 0) {
    throw new Error('Usage: extract-brand.js <url> [--refresh-brand] [--no-cache]');
  }
  return { url: remaining[0], forceRefresh };
}

async function main() {
  const { url, forceRefresh } = parseArgs(process.argv);
  const domain = extractDomain(url);
  if (!domain) throw new Error(`Could not parse domain from ${url}`);

  let spec = readCache(domain);
  const useCache = spec && !isExpired(spec) && !forceRefresh;

  if (useCache) {
    process.stderr.write(`cached (${spec.extractedAt}): ${cachePath(domain)}\n`);
  } else {
    if (forceRefresh && spec) {
      process.stderr.write(`--refresh-brand: ignoring cache\n`);
    } else if (spec) {
      process.stderr.write(`cache expired (>${TTL_DAYS} days), re-fetching\n`);
    }
    spec = await fetchBrand(url);
    spec.extractedAt = new Date().toISOString();
    const p = writeCache(spec);
    process.stderr.write(`saved: ${p}\n`);
  }

  process.stdout.write(JSON.stringify(spec, null, 2) + '\n');
}

module.exports = {
  extractDomain,
  extractBrandFromHtml,
  resolveImageAsDataUrl,
  fetchBrand,
  readCache,
  writeCache,
  isExpired,
  cachePath,
  CACHE_DIR,
  TTL_DAYS,
  parseArgs,
};

if (require.main === module) {
  main().catch(err => { console.error(err.message); process.exit(1); });
}
