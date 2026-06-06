'use strict';
const fs = require('node:fs');
const path = require('node:path');

const PX_PER_INCH = 96;
const PX_TO_INCH = 1 / PX_PER_INCH;

function renderTemplate(html, data) {
  let out = html;
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{{${key}}}`;
    if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === 'string') {
        out = out.split(placeholder).join(value.map(v => `<li>${escapeHtml(v)}</li>`).join(''));
      } else {
        out = out.split(placeholder).join(value.map(v => metricCardHtml(v)).join(''));
      }
    } else {
      out = out.split(placeholder).join(escapeHtml(String(value)));
    }
  }
  return out;
}

function metricCardHtml(m) {
  return `<div class="metric-card"><div class="metric-label">${escapeHtml(m.label || '')}</div><div class="metric-value">${escapeHtml(m.value || '')}</div><div class="metric-change">${escapeHtml(m.change || '')}</div></div>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function mapToPptxAdd(rect) {
  return {
    x: pxToInch(rect.x),
    y: pxToInch(rect.y),
    w: pxToInch(rect.width),
    h: pxToInch(rect.height),
    color: rect.color,
    fontSize: rect.fontSize,
    fontFace: rect.fontFace,
    bold: rect.bold,
    align: rect.align,
  };
}

function pxToInch(px) {
  if (typeof px !== 'number') return px;
  return Math.round(px * PX_TO_INCH * 1000) / 1000;
}

function prepareSlideData(slide, sectionNum = '01') {
  const data = { SECTION_NUM: sectionNum, TITLE: slide.title || '' };
  if (slide.layout === 'two-column') {
    data.LEFT_TITLE = slide.leftTitle || '';
    data.LEFT_POINTS = slide.leftPoints || [];
    data.RIGHT_TITLE = slide.rightTitle || '';
    data.RIGHT_POINTS = slide.rightPoints || [];
  } else if (slide.layout === 'data') {
    data.METRIC_CARDS = slide.metrics || [];
  } else if (slide.layout === 'quote') {
    data.QUOTE = slide.quote || '';
    data.ATTRIBUTION = slide.attribution || '';
  }
  return data;
}

function buildSectionFromTemplate(pres, slide, theme, htmlTemplate, sectionNum) {
  const data = prepareSlideData(slide, sectionNum);
  const fullHtml = renderTemplate(htmlTemplate, data);
  const s = pres.addSlide();
  s.background = { color: theme.bg };
  s.addText(slide.title || '', {
    x: theme.spacing, y: 2.5, w: 13.333 - theme.spacing * 2, h: 1.5,
    fontFace: theme.fontTitle, fontSize: theme.sizeH1,
    color: theme.accent, bold: true, align: 'center', opacity: 0.6,
  });
  s.addText(slide.title || '', {
    x: theme.spacing, y: 4.0, w: 13.333 - theme.spacing * 2, h: 0.8,
    fontFace: theme.fontTitle, fontSize: theme.sizeH1,
    color: theme.text, bold: true, align: 'center',
  });
  s.addShape('line', {
    x: 6.0, y: 5.0, w: 1.33, h: 0,
    line: { color: theme.accent, width: 4 },
  });
  return s;
}

function buildTwoColumnFromTemplate(pres, slide, theme) {
  const s = pres.addSlide();
  s.background = { color: theme.bg };
  s.addText(slide.title || '', {
    x: theme.spacing, y: 0.4, w: 13.333 - theme.spacing * 2, h: 0.8,
    fontFace: theme.fontTitle, fontSize: theme.sizeH2,
    color: theme.text, bold: true,
  });
  const colW = (13.333 - theme.spacing * 3) / 2;
  const colY = 1.6;
  const colH = 5.5;
  s.addShape('roundRect', {
    x: theme.spacing, y: colY, w: colW, h: colH,
    fill: { color: theme.bgAlt },
    line: { color: theme.bgAlt, width: 0 },
    rectRadius: theme.rectRadius,
  });
  s.addText(slide.leftTitle || '', {
    x: theme.spacing + 0.3, y: colY + 0.3, w: colW - 0.6, h: 0.6,
    fontFace: theme.fontTitle, fontSize: theme.sizeH3,
    color: theme.accent, bold: true,
  });
  const leftBody = (slide.leftPoints || []).map(p => '• ' + p).join('\n');
  if (leftBody) {
    s.addText(leftBody, {
      x: theme.spacing + 0.3, y: colY + 1.1, w: colW - 0.6, h: colH - 1.4,
      fontFace: theme.fontBody, fontSize: theme.sizeBase,
      color: theme.text, valign: 'top', paraSpaceAfter: 8,
    });
  }
  s.addShape('roundRect', {
    x: theme.spacing * 2 + colW, y: colY, w: colW, h: colH,
    fill: { color: theme.bgAlt },
    line: { color: theme.bgAlt, width: 0 },
    rectRadius: theme.rectRadius,
  });
  s.addText(slide.rightTitle || '', {
    x: theme.spacing * 2 + colW + 0.3, y: colY + 0.3, w: colW - 0.6, h: 0.6,
    fontFace: theme.fontTitle, fontSize: theme.sizeH3,
    color: theme.accent, bold: true,
  });
  const rightBody = (slide.rightPoints || []).map(p => '• ' + p).join('\n');
  if (rightBody) {
    s.addText(rightBody, {
      x: theme.spacing * 2 + colW + 0.3, y: colY + 1.1, w: colW - 0.6, h: colH - 1.4,
      fontFace: theme.fontBody, fontSize: theme.sizeBase,
      color: theme.text, valign: 'top', paraSpaceAfter: 8,
    });
  }
  return s;
}

function buildDataFromTemplate(pres, slide, theme) {
  const s = pres.addSlide();
  s.background = { color: theme.bg };
  s.addText(slide.title || '', {
    x: theme.spacing, y: 0.4, w: 13.333 - theme.spacing * 2, h: 0.8,
    fontFace: theme.fontTitle, fontSize: theme.sizeH2,
    color: theme.text, bold: true,
  });
  const metrics = slide.metrics || [];
  if (metrics.length === 0) return s;
  const cols = Math.min(3, metrics.length);
  const cardW = (13.333 - theme.spacing * (cols + 1)) / cols;
  const cardH = 2.5;
  const cardY = 1.8;
  metrics.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = theme.spacing + col * (cardW + theme.spacing);
    const y = cardY + row * (cardH + theme.spacing);
    s.addShape('roundRect', {
      x, y, w: cardW, h: cardH,
      fill: { color: theme.bgAlt },
      line: { color: theme.bgAlt, width: 0 },
      rectRadius: theme.rectRadius,
    });
    s.addText(m.label || '', {
      x: x + 0.2, y: y + 0.2, w: cardW - 0.4, h: 0.4,
      fontFace: theme.fontBody, fontSize: theme.sizeSm,
      color: theme.secondary, align: 'center',
    });
    s.addText(m.value || '', {
      x: x + 0.2, y: y + 0.6, w: cardW - 0.4, h: 1.0,
      fontFace: theme.fontTitle, fontSize: theme.sizeH1,
      color: theme.text, bold: true, align: 'center',
    });
    s.addText(m.change || '', {
      x: x + 0.2, y: y + 1.7, w: cardW - 0.4, h: 0.4,
      fontFace: theme.fontBody, fontSize: theme.sizeSm,
      color: theme.accent, bold: true, align: 'center',
    });
  });
  return s;
}

function buildQuoteFromTemplate(pres, slide, theme) {
  const s = pres.addSlide();
  s.background = { color: theme.bg };
  s.addText('"', {
    x: 0, y: 1.5, w: 13.333, h: 2.0,
    fontFace: theme.fontTitle, fontSize: 200,
    color: theme.accent, align: 'center', valign: 'middle', opacity: 0.3,
  });
  s.addText(slide.quote || '', {
    x: 2.0, y: 3.0, w: 9.333, h: 2.0,
    fontFace: theme.fontBody, fontSize: theme.sizeH2,
    color: theme.text, italic: true, align: 'center', valign: 'middle',
  });
  s.addText('— ' + (slide.attribution || ''), {
    x: 2.0, y: 5.2, w: 9.333, h: 0.5,
    fontFace: theme.fontBody, fontSize: theme.sizeSm,
    color: theme.secondary, align: 'center',
  });
  return s;
}

async function renderSection(pres, slide, theme) {
  return buildSectionFromTemplate(pres, slide, theme, '', '01');
}

async function renderTwoColumn(pres, slide, theme) {
  return buildTwoColumnFromTemplate(pres, slide, theme);
}

async function renderData(pres, slide, theme) {
  return buildDataFromTemplate(pres, slide, theme);
}

async function renderQuote(pres, slide, theme) {
  return buildQuoteFromTemplate(pres, slide, theme);
}

module.exports = {
  renderTemplate, mapToPptxAdd, pxToInch, prepareSlideData,
  renderSection, renderTwoColumn, renderData, renderQuote,
  buildSectionFromTemplate, buildTwoColumnFromTemplate,
  buildDataFromTemplate, buildQuoteFromTemplate,
  PX_TO_INCH, PX_PER_INCH,
};
