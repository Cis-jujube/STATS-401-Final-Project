// No timers or DOM here. Every segment ends at one complete, named stop.
(() => {
  'use strict';
  class PresentationClock {
    constructor(stops) {
      if (!stops.length || new Set(stops.map(s => s.id)).size !== stops.length) {
        throw new Error('Presentation stops need unique IDs.');
      }
      this.stops = stops;
      this.jump(stops[0].id);
    }
    jump(id) {
      const index = this.stops.findIndex(stop => stop.id === id);
      if (index < 0) throw new Error(`Unknown presentation stop: ${id}`);
      this.index = index;
      this.current = this.stops[index];
      this.target = null;
      this.state = 'HOLD';
      this.elapsed = 0;
      this.lastTime = null;
    }
    next(now, animate = true) {
      if (this.state !== 'HOLD' || this.index === this.stops.length - 1) return false;
      this.target = this.stops[this.index + 1];
      this.elapsed = 0;
      this.lastTime = now;
      this.state = 'PLAYING';
      if (!animate) this.finish();
      return true;
    }
    tick(now) {
      if (this.state !== 'PLAYING') return;
      this.elapsed += Math.max(0, now - this.lastTime);
      this.lastTime = now;
      if (this.elapsed >= this.target.duration) this.finish();
    }
    pause(now) {
      if (this.state !== 'PLAYING') return;
      this.tick(now);
      if (this.state === 'PLAYING') this.state = 'PAUSED';
      this.lastTime = null;
    }
    resume(now) {
      if (this.state !== 'PAUSED') return;
      this.lastTime = now;
      this.state = 'PLAYING';
    }
    finish() {
      if (this.target) this.jump(this.target.id);
    }
    previous() {
      this.jump(this.stops[this.state === 'HOLD' ? Math.max(0, this.index - 1) : this.index].id);
    }
    replay(now, animate = true) {
      if (this.state !== 'HOLD' || this.index === 0) return false;
      this.jump(this.stops[this.index - 1].id);
      return this.next(now, animate);
    }
    get progress() { return this.target ? this.elapsed / this.target.duration : 1; }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {PresentationClock};
  else globalThis.PresentationClock = PresentationClock;
})();
