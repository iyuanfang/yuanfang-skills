'use strict';

const VALID_LAYOUTS = ['cover', 'section', 'content', 'two-column', 'data', 'quote', 'summary'];

function parseSlides(content) {
  if (!content || typeof content !== 'object') {
    throw new Error('content 必须是对象');
  }
  let slides;
  if (Array.isArray(content.slides) && content.slides.length > 0) {
    slides = content.slides;
  } else if (content.layout) {
    // single-page shorthand: wrap top-level fields into a single slide
    const { layout, title, body, subtitle, points, leftTitle, leftPoints, rightTitle, rightPoints, metrics, quote, attribution } = content;
    slides = [{ layout, title, body, subtitle, points, leftTitle, leftPoints, rightTitle, rightPoints, metrics, quote, attribution }];
  } else {
    throw new Error('content 缺少 slides 数组或单页 layout');
  }
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    if (!VALID_LAYOUTS.includes(s.layout)) {
      throw new Error(`slide #${i + 1}: layout '${s.layout}' 未知. 支持: ${VALID_LAYOUTS.join(', ')}`);
    }
    if (!s.title) {
      throw new Error(`slide #${i + 1}: 缺少 title 字段`);
    }
  }
  return {
    brand: content.brand,
    theme: content.theme,
    title: content.title || slides[0]?.title,
    author: content.author,
    date: content.date,
    logo: content.logo,
    slides,
  };
}

module.exports = { parseSlides, VALID_LAYOUTS };
