const test = require('node:test');
const assert = require('node:assert');
const { renderTemplate, mapToPptxAdd, pxToInch, prepareSlideData } = require('../../scripts/generator-c');

test('renderTemplate replaces {{TITLE}} and {{SECTION_NUM}} placeholders', () => {
  const html = '<div class="section-number">{{SECTION_NUM}}</div><div class="section-title">{{TITLE}}</div>';
  const data = { SECTION_NUM: '01', TITLE: '战略方向' };
  const result = renderTemplate(html, data);
  assert.ok(result.includes('01'));
  assert.ok(result.includes('战略方向'));
  assert.ok(!result.includes('{{TITLE}}'));
});

test('renderTemplate handles left/right points lists (joins as <li>)', () => {
  const html = '<ul class="col-points">{{LEFT_POINTS}}</ul>';
  const data = { LEFT_POINTS: ['开源', '可定制', '低成本'] };
  const result = renderTemplate(html, data);
  assert.ok(result.includes('<li>开源</li>'));
  assert.ok(result.includes('<li>可定制</li>'));
  assert.ok(result.includes('<li>低成本</li>'));
});

test('renderTemplate handles metric cards (joins as <div class="metric-card">)', () => {
  const html = '<div class="data-grid">{{METRIC_CARDS}}</div>';
  const data = {
    METRIC_CARDS: [
      { label: 'MAU', value: '120 万', change: '+15%' },
      { label: '营收', value: '¥580 万', change: '+22%' },
    ],
  };
  const result = renderTemplate(html, data);
  assert.ok(result.includes('class="metric-card"'));
  assert.ok(result.includes('MAU'));
  assert.ok(result.includes('120 万'));
  assert.ok(result.includes('+15%'));
});

test('mapToPptxAdd converts pixel rect to inch (96 DPI)', () => {
  const rect = { x: 96, y: 48, width: 192, height: 96, color: '#fff', fontSize: 32 };
  const result = mapToPptxAdd(rect);
  assert.strictEqual(result.x, 1);
  assert.strictEqual(result.y, 0.5);
  assert.strictEqual(result.w, 2);
  assert.strictEqual(result.h, 1);
});

test('prepareSlideData builds render data for cover (A scheme placeholder)', () => {
  const slide = { layout: 'cover', title: 'Hi' };
  const data = prepareSlideData(slide);
  assert.strictEqual(data.TITLE, 'Hi');
  assert.strictEqual(data.SECTION_NUM, '01');
});

test('prepareSlideData builds render data for two-column', () => {
  const slide = {
    layout: 'two-column',
    title: '对比',
    leftTitle: '我们',
    leftPoints: ['a', 'b'],
    rightTitle: '竞品',
    rightPoints: ['x', 'y'],
  };
  const data = prepareSlideData(slide);
  assert.strictEqual(data.TITLE, '对比');
  assert.strictEqual(data.LEFT_TITLE, '我们');
  assert.deepStrictEqual(data.LEFT_POINTS, ['a', 'b']);
  assert.deepStrictEqual(data.RIGHT_POINTS, ['x', 'y']);
});

test('prepareSlideData builds render data for data layout', () => {
  const slide = {
    layout: 'data',
    title: '指标',
    metrics: [{ label: 'MAU', value: '120 万', change: '+15%' }],
  };
  const data = prepareSlideData(slide);
  assert.strictEqual(data.TITLE, '指标');
  assert.strictEqual(data.METRIC_CARDS.length, 1);
  assert.strictEqual(data.METRIC_CARDS[0].label, 'MAU');
});

test('prepareSlideData builds render data for quote', () => {
  const slide = {
    layout: 'quote',
    title: '客户评价',
    quote: '改变工作方式',
    attribution: '张伟',
  };
  const data = prepareSlideData(slide);
  assert.strictEqual(data.QUOTE, '改变工作方式');
  assert.strictEqual(data.ATTRIBUTION, '张伟');
});
