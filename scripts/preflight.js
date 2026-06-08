function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

function luminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(c1, c2) {
  const l1 = luminance(c1.r, c1.g, c1.b);
  const l2 = luminance(c2.r, c2.g, c2.b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function extractVarValue(themeCSS, varName) {
  const m = themeCSS.match(new RegExp(`--${varName}\\s*:\\s*([^;]+);`));
  if (!m) return null;
  return m[1].trim().replace(/"/g, '');
}

function isHexColor(s) {
  return typeof s === 'string' && /^#([0-9a-fA-F]{3}){1,2}$/.test(s);
}

const ACCENT_HEXES = {
  indigo:  '#4F46E5',
  emerald: '#059669',
  rose:    '#E11D48',
  amber:   '#D97706',
  slate:   '#475569',
};

function preflight(themeCSS, params, opts = {}) {
  const warnings = [];
  const errors = [];
  const platform = opts.platform || { width: 1080, height: 1440 };

  const bgRaw = extractVarValue(themeCSS, 'bg');
  const text1Raw = extractVarValue(themeCSS, 'text-1');
  const text2Raw = extractVarValue(themeCSS, 'text-2');
  const accentRaw = extractVarValue(themeCSS, 'accent');

  const effectiveAccent = (params.accent && ACCENT_HEXES[params.accent]) || accentRaw;

  if (isHexColor(bgRaw) && isHexColor(text2Raw)) {
    const c = contrastRatio(hexToRgb(bgRaw), hexToRgb(text2Raw));
    if (c < 4.5) {
      (c < 3 ? errors : warnings).push(
        `text-2 contrast on bg = ${c.toFixed(2)}:1 (WCAG AA needs 4.5:1)`,
      );
    }
  }

  if (isHexColor(bgRaw) && isHexColor(effectiveAccent)) {
    const c = contrastRatio(hexToRgb(bgRaw), hexToRgb(effectiveAccent));
    if (c < 3) {
      errors.push(
        `accent contrast on bg = ${c.toFixed(2)}:1 (WCAG AA large-text needs 3:1)`,
      );
    }
  }

  const titleSizeRaw = extractVarValue(themeCSS, 'title-size-v');
  if (titleSizeRaw) {
    const titleSize = parseInt(titleSizeRaw);
    const shorter = Math.min(platform.width, platform.height);
    if (titleSize > shorter * 0.5) {
      errors.push(
        `title-size-v = ${titleSize}px exceeds 50% of canvas shorter side (${shorter}px); will overflow on multi-line titles`,
      );
    } else if (titleSize > shorter * 0.3) {
      warnings.push(
        `title-size-v = ${titleSize}px is large (${Math.round(titleSize/shorter*100)}% of ${shorter}px canvas)`,
      );
    }
  }

  if (params.accent && !ACCENT_HEXES[params.accent]) {
    errors.push(`unknown accent: ${params.accent}`);
  }

  return { warnings, errors, ok: errors.length === 0 };
}

module.exports = { preflight, contrastRatio, hexToRgb, luminance };
