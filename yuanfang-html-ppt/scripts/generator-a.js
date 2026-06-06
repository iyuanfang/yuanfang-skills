'use strict';

function renderCover(pres, slide, theme) {
  const s = pres.addSlide();
  s.background = { color: theme.bg };
  s.addText(slide.title || '', {
    x: theme.spacing, y: 2.0, w: 13.333 - theme.spacing * 2, h: 1.5,
    fontFace: theme.fontTitle, fontSize: theme.sizeH1,
    color: theme.text, bold: true, align: 'center',
  });
  if (slide.subtitle) {
    s.addText(slide.subtitle, {
      x: theme.spacing, y: 3.6, w: 13.333 - theme.spacing * 2, h: 0.6,
      fontFace: theme.fontBody, fontSize: theme.sizeH2,
      color: theme.textSecondary, align: 'center',
    });
  }
  if (slide.author || slide.date) {
    const authorLine = [slide.author, slide.date].filter(Boolean).join(' · ');
    s.addText(authorLine, {
      x: theme.spacing, y: 6.5, w: 13.333 - theme.spacing * 2, h: 0.4,
      fontFace: theme.fontBody, fontSize: theme.sizeSm,
      color: theme.textSecondary, align: 'center',
    });
  }
  return s;
}

function renderContent(pres, slide, theme) {
  const s = pres.addSlide();
  s.background = { color: theme.bg };
  s.addText(slide.title || '', {
    x: theme.spacing, y: 0.4, w: 13.333 - theme.spacing * 2, h: 0.8,
    fontFace: theme.fontTitle, fontSize: theme.sizeH2,
    color: theme.text, bold: true, align: 'left',
  });
  const body = (slide.points || (slide.body ? [slide.body] : [])).join('\n');
  s.addText(body, {
    x: theme.spacing, y: 1.5, w: 13.333 - theme.spacing * 2, h: 5.5,
    fontFace: theme.fontBody, fontSize: theme.sizeBase,
    color: theme.text, valign: 'top', paraSpaceAfter: 8,
    bullet: slide.points ? { code: '25CF' } : false,
  });
  return s;
}

function renderSummary(pres, slide, theme) {
  const s = pres.addSlide();
  s.background = { color: theme.bg };
  s.addText(slide.title || '', {
    x: theme.spacing, y: 0.4, w: 13.333 - theme.spacing * 2, h: 0.8,
    fontFace: theme.fontTitle, fontSize: theme.sizeH2,
    color: theme.text, bold: true, align: 'left',
  });
  const body = (slide.points || []).join('\n');
  if (body) {
    s.addText(body, {
      x: theme.spacing, y: 1.5, w: 13.333 - theme.spacing * 2, h: 4.0,
      fontFace: theme.fontBody, fontSize: theme.sizeBase,
      color: theme.text, valign: 'top', paraSpaceAfter: 8,
      bullet: { code: '25CF' },
    });
  }
  s.addText('谢谢 · Thank You', {
    x: theme.spacing, y: 6.2, w: 13.333 - theme.spacing * 2, h: 0.6,
    fontFace: theme.fontTitle, fontSize: theme.sizeH1,
    color: theme.accent, bold: true, align: 'center',
  });
  return s;
}

module.exports = { renderCover, renderContent, renderSummary };
