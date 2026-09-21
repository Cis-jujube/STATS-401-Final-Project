// DOM harness: checks scheduling and read/write discipline, not browser FPS.
const {runInNewContext} = require('node:vm');
const {readFileSync} = require('node:fs');
const assert = require('node:assert/strict');
let wrote = false;
let clock = 0;
let id = 0;
const frames = new Map();
const events = {};
const media = [];
const nodes = new Map();
let context;
function node(top = 0, height = 1000) {
  return {
    dataset: {}, values: {},
    style: {setProperty(name, value) { wrote = true; this[name] = value; }},
    classList: {toggle() {}},
    addEventListener(name, callback) { this.values[name] = callback; },
    setAttribute() {},
    getBoundingClientRect() {
      assert.equal(wrote, false, 'geometry read after a style write');
      return {top: top - context.scrollY, bottom: top + height - context.scrollY, height};
    },
    getContext() { return null; },
  };
}
const directions = ['down', 'left', 'diagonal', 'right', 'up', 'left', 'right', 'diagonal', 'up', 'left'];
const chapters = directions.map((direction, i) => {
  const chapter = node(2000 + i * 1650, 1650);
  chapter.dataset.direction = direction;
  return chapter;
});
for (const selector of ['.hero-track', '.material-scene', '.journey-opening', '#evidence', '.reading-progress', '#focus-dialog', '#close-focus', '#cursor-light', '#motion-toggle', '#motion-toggle span']) nodes.set(selector, node());
nodes.set('.hero-track', node(0, 1650));
nodes.set('.journey-opening', node(1650, 350));
nodes.set('#evidence', node(18500, 3000));
const figureNodes = directions.map((_, i) => node(2700 + i * 1650, 700));
const document = {
  body: node(), hidden: false,
  documentElement: {scrollHeight: 21500, style: {}, classList: {toggle() {}}},
  querySelector: selector => nodes.get(selector),
  querySelectorAll: selector => selector === '.story-chapter' ? chapters : selector === '.chapter-figure' ? figureNodes : [],
  addEventListener: (name, callback) => {events[name] = callback;},
  elementFromPoint: () => null,
};
context = {document, scrollY: 0, innerHeight: 1000, innerWidth: 1400,
  performance: {now: () => clock},
  matchMedia: query => {const result = {matches: !query.includes('reduced'), addEventListener(name, cb) {this.change = cb;}}; media.push(result); return result;},
  requestAnimationFrame: cb => {frames.set(++id, cb); return id;},
  cancelAnimationFrame: key => frames.delete(key),
  addEventListener: (name, cb) => {events[name] = cb;},
};
function tick() {
  clock += 16;
  const pending = [...frames.values()]; frames.clear();
  for (const callback of pending) {wrote = false; callback(clock);}
}
function settle() {let count = 0; while (frames.size && count++ < 100) tick(); assert.equal(frames.size, 0, 'animation should stop when settled');}
runInNewContext(readFileSync('assets/motion-math.js', 'utf8'), context);
runInNewContext(readFileSync('assets/site.js', 'utf8'), context);
settle();
context.scrollY = 3400;
for (let i = 0; i < 20; i++) events.scroll();
assert.equal(frames.size, 1, 'scroll events coalesce into one frame');
settle();
context.scrollY = 200; events.scroll(); settle();
assert.ok(parseFloat(chapters[1].style['--panel-x']) < 0, 'left entry starts to the left');
assert.ok(parseFloat(chapters[3].style['--panel-x']) > 0, 'right entry starts to the right');
assert.ok(parseFloat(chapters[2].style['--panel-y']) > 0, 'diagonal includes vertical travel');
context.scrollY = 2000 + 9 * 1650; events.scroll(); settle();
assert.equal(parseFloat(chapters[9].style['--panel-x']), 0, 'last chapter settles in place');
assert.equal(chapters[9].style['--shards-visible'], '0', 'settled chart uses intact original');
media[0].matches = true; media[0].change(); settle();
assert.equal(nodes.get('#motion-toggle').disabled, true);
for (const chapter of chapters) {
  assert.equal(parseFloat(chapter.style['--panel-x']) || 0, 0);
  assert.equal(chapter.style['--shards-visible'], '0');
}
context.scrollY = 4000; events.scroll();
document.hidden = true; events.visibilitychange();
assert.equal(frames.size, 0);
document.hidden = false; events.visibilitychange(); settle();
media[0].matches = false; media[0].change(); settle();
media[2].matches = false; context.innerWidth = 390; events.resize(); settle();
context.scrollY = 3400; events.scroll(); settle();
assert.ok(Number.isFinite(parseFloat(chapters[0].style['--entry'])));
assert.ok(Number(chapters[0].style['--figure-expand']) >= .82);
assert.ok(Number(chapters[0].style['--figure-expand']) <= 1.0045);
console.log('PASS: batched geometry, coalesced scroll, idle stop, reverse scroll, reduced motion, hidden-tab pause');
