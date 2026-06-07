'use strict';

function addSlideFooter(slide, theme, dims, opts = {}) {
  if (opts.showFooter === false) return;

  const margin = 0.15;
  const width = 1.2;
  const height = 0.3;
  const x = dims.w - margin - width;
  const y = dims.h - margin - height;

  if (typeof slide.addText === 'function') {
    slide.addText(String(slide._slideNum || ''), {
      x, y, w: width, h: height,
      fontFace: theme.fontBody,
      fontSize: 9,
      color: theme.secondary,
      align: 'right',
    });
  }
}

module.exports = { addSlideFooter };
