/* Stable, frame-rate independent spring for presentation transforms only. */
(function (root) {
  'use strict';
  const clamp = value => Math.max(0, Math.min(1, value));
  function ease(value) {
    const t = clamp(value);
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  function spring(state, target, seconds) {
    const dt = Math.min(.064, Math.max(0, seconds));
    const frequency = 19, damping = .78;
    const decay = frequency * damping;
    const omega = frequency * Math.sqrt(1 - damping * damping);
    const displacement = state.value - target;
    const b = (state.velocity + decay * displacement) / omega;
    const cos = Math.cos(omega * dt), sin = Math.sin(omega * dt);
    const envelope = Math.exp(-decay * dt);
    const offset = envelope * (displacement * cos + b * sin);
    const velocity = envelope * ((-decay * displacement + omega * b) * cos + (-decay * b - omega * displacement) * sin);
    const settled = Math.abs(offset) < .0002 && Math.abs(velocity) < .003;
    return {value: settled ? target : target + offset, velocity: settled ? 0 : velocity, settled};
  }
  class LandingPause {
    constructor() { this.lastWheel = -Infinity; this.until = 0; this.armed = false; }
    land(now) {
      if (now - this.lastWheel < 250) { this.until = now + 550; this.armed = true; }
    }
    wheel(now) {
      const quiet = now - this.lastWheel > 180;
      this.lastWheel = now;
      if (!this.armed) return false;
      if (now >= this.until && quiet) { this.armed = false; return false; }
      return true;
    }
    reset() { this.armed = false; this.lastWheel = -Infinity; }
  }
  const api = {clamp, ease, spring, LandingPause};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StoryMotion = api;
})(globalThis);
