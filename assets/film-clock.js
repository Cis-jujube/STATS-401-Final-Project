// A seekable edit: transition + reading time, driven by one external frame clock.
(() => {
  'use strict';
  class FilmClock {
    constructor(stops) {
      if (!stops.length || new Set(stops.map(s => s.id)).size !== stops.length) {
        throw new Error('Film stops need unique IDs.');
      }
      this.stops = stops;
      this.segments = [];
      this.duration = 0;
      this.landings = new Map();
      stops.forEach((stop, index) => {
        const hold = stop.hold;
        const transition = index ? stop.filmDuration : 0;
        if (!Number.isFinite(hold) || hold <= 0 || !Number.isFinite(transition) || transition < 0) {
          throw new Error('Film durations must be finite, with positive reading time.');
        }
        if (transition) this.add(index - 1, index, transition);
        this.landings.set(stop.id, this.duration);
        this.add(index, null, hold);
      });
      this.state = 'PAUSED';
      this.seek(0);
    }
    add(index, targetIndex, duration) {
      this.segments.push({index, targetIndex, start: this.duration, end: this.duration + duration});
      this.duration += duration;
    }
    locate() {
      const segment = this.segments.find(s => this.position < s.end) || this.segments.at(-1);
      this.index = segment.index;
      this.current = this.stops[this.index];
      this.target = segment.targetIndex === null ? null : this.stops[segment.targetIndex];
      this.segment = segment;
      this.elapsed = this.position - segment.start;
      if (this.position === this.duration) { this.state = 'HOLD'; this.lastTime = null; }
    }
    seek(position) {
      if (!Number.isFinite(position)) throw new Error('Film position must be finite.');
      this.position = Math.min(this.duration, Math.max(0, position));
      this.state = 'PAUSED';
      this.lastTime = null;
      this.locate();
    }
    tick(now) {
      if (this.state !== 'PLAYING') return;
      this.position = Math.min(this.duration, this.position + Math.max(0, now - this.lastTime));
      this.lastTime = now;
      this.locate();
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
    restart(now) { this.seek(0); this.resume(now); }
    jump(id) {
      if (!this.landings.has(id)) throw new Error(`Unknown film stop: ${id}`);
      this.seek(this.landings.get(id));
    }
    previous() { this.jump(this.stops[this.target ? this.index : Math.max(0, this.index - 1)].id); }
    next() { this.jump(this.stops[Math.min(this.index + 1, this.stops.length - 1)].id); }
    finish() { this.jump((this.target || this.current).id); }
    replay(now) {
      if (!this.index || this.target) return false;
      const entrance = this.segments.find(s => s.targetIndex === this.index);
      this.seek(entrance ? entrance.start : this.landings.get(this.current.id));
      this.resume(now);
      return true;
    }
    get progress() { return this.target ? this.elapsed / (this.segment.end - this.segment.start) : 1; }
    get readingProgress() { return this.target ? 0 : this.elapsed / (this.segment.end - this.segment.start); }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {FilmClock};
  else globalThis.FilmClock = FilmClock;
})();
