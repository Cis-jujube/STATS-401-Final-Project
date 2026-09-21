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
const chapters = [2000, 3650, 5300, 6950].map(top => node(top, 1650));
for (const selector of ['.hero-track', '.material-scene', '.journey-opening', '#evidence', '.reading-progress', '#focus-dialog', '#close-focus', '#cursor-light', '#motion-toggle', '#motion-toggle span']) nodes.set(selector, node());
nodes.set('.hero-track', node(0, 1650));
nodes.set('.journey-opening', node(1650, 350));
nodes.set('#evidence', node(8600, 3000));
const document = {
  body: node(), hidden: false,
  documentElement: {scrollHeight: 12000, style: {}},
  querySelector: selector => nodes.get(selector),
  querySelectorAll: selector => selector === '.story-chapter' ? chapters : [],
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
runInNewContext(readFileSync('assets/site.js', 'utf8'), context);
settle();
context.scrollY = 3400;
for (let i = 0; i < 20; i++) events.scroll();
assert.equal(frames.size, 1, 'scroll events coalesce into one frame');
settle();
context.scrollY = 200; events.scroll(); settle();
media[0].matches = true; media[0].change(); settle();
assert.equal(nodes.get('#motion-toggle').disabled, true);
context.scrollY = 4000; events.scroll();
document.hidden = true; events.visibilitychange();
assert.equal(frames.size, 0);
document.hidden = false; events.visibilitychange(); settle();
console.log('PASS: batched geometry, coalesced scroll, idle stop, reverse scroll, reduced motion, hidden-tab pause');
