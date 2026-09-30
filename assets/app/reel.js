/* Loop mode: a highlight reel cut on a beat grid, like a music video edit.
   Each shot plays a stretch of an existing scene (from → to, in that scene's own seconds)
   squeezed or stretched into a number of beats, so the rhythm is deliberately uneven:
   one-second flurries, speed ramps, and longer holds on the key frames.
     warp  how the scene clock moves inside the shot: linear | out (fast, then settle) | in | inOut
     cut   how the shot starts: cut (flash + punch-in) | whip (fast slide) | morph (particles
           fly between the two formations) | none (same scene continues)
     blend beats over which the submission particles travel from the previous shot
     say   the short phrase slammed onto the screen (the story mode keeps the full captions)
   128 beats = 32 bars. At the default 120 BPM the reel lasts 64 s and loops seamlessly: its
   last frame (the particle "100") dissolves into the starfield its first frame opens with. */
(function () {
  const F = window.Film;
  F.reel = {
    bpm: 120,
    shots: [
      // ignition: out of the stars, the score everyone sees
      { scene: 'open', from: 0.2, to: 1.0, beats: 6, cut: 'morph', blend: 5 },
      { scene: 'open', from: 1.0, to: 4.9, beats: 4, warp: 'out', say: '2,807 submissions.' },
      { scene: 'open', from: 4.9, to: 6.6, beats: 6, say: 'The score has a <em>past.</em>' },
      // the raw material
      { scene: 'homeworks', from: 0.0, to: 3.8, beats: 4, warp: 'out', cut: 'morph', blend: 3, say: 'One dot, one submission.' },
      { scene: 'homeworks', from: 8.6, to: 10.4, beats: 2, cut: 'cut', say: 'Four homeworks.' },
      // time
      { scene: 'time', from: 0.2, to: 3.9, beats: 4, warp: 'out', cut: 'morph', blend: 3, say: 'When?' },
      { scene: 'time', from: 8.5, to: 10.2, beats: 2, warp: 'out', cut: 'cut', say: '153 in four hours.' },
      { scene: 'time', from: 16.2, to: 17.6, beats: 2, cut: 'cut', say: '979 <em>masked.</em>' },
      { scene: 'time', from: 23.6, to: 27.8, beats: 8, warp: 'inOut', cut: 'whip', say: 'Wind it into a <em>clock.</em>' },
      { scene: 'time', from: 31.4, to: 34.4, beats: 6, warp: 'out', say: 'Saturdays and deadline nights.' },
      // problems
      { scene: 'problems', from: 0.4, to: 3.0, beats: 4, warp: 'out', cut: 'cut', say: '31 problems. All near 100.' },
      { scene: 'problems', from: 7.6, to: 10.6, beats: 4, say: 'First tries: <em>far below.</em>' },
      { scene: 'problems', from: 14.6, to: 20.0, beats: 4, warp: 'inOut', say: 'Try. Again. Again.' },
      { scene: 'problems', from: 30.4, to: 33.4, beats: 4, warp: 'out', cut: 'cut', say: '37.9 → <em>100.</em>' },
      { scene: 'problems', from: 37.3, to: 39.6, beats: 2, warp: 'out', cut: 'whip' },
      // attempts
      { scene: 'attempts', from: 0.0, to: 3.8, beats: 4, warp: 'out', cut: 'morph', blend: 3, say: '1,131 first tries.' },
      { scene: 'attempts', from: 9.8, to: 13.2, beats: 4, warp: 'out', cut: 'cut', say: 'Similar medians. <em>Long tails.</em>' },
      { scene: 'attempts', from: 26.6, to: 32.4, beats: 4, warp: 'inOut', cut: 'whip', say: 'The cohort thins.' },
      // retries
      { scene: 'retries', from: 0.2, to: 4.8, beats: 4, warp: 'out', cut: 'morph', blend: 3, say: '1,222 retries.' },
      { scene: 'retries', from: 7.2, to: 10.2, beats: 2, warp: 'inOut' },
      { scene: 'retries', from: 10.2, to: 14.2, beats: 8, say: '468 new <em>bests.</em>' },
      { scene: 'retries', from: 16.0, to: 19.4, beats: 4, warp: 'out', say: 'Instant resubmits pay off less.' },
      { scene: 'retries', from: 24.2, to: 28.6, beats: 4, warp: 'out', cut: 'whip', say: 'Progress arrives late.' },
      { scene: 'retries', from: 34.2, to: 39.6, beats: 4, warp: 'out', cut: 'cut', say: 'Some problems become <em>loops.</em>' },
      // the midterm
      { scene: 'exam', from: 0.4, to: 3.4, beats: 4, warp: 'out', cut: 'whip', say: '26 midterm scores.' },
      { scene: 'exam', from: 8.4, to: 11.0, beats: 4, warp: 'out', cut: 'cut', say: 'One habit stands apart.' },
      { scene: 'exam', from: 23.4, to: 30.4, beats: 6, say: 'ρ = −0.48, checked three ways.' },
      { scene: 'exam', from: 31.2, to: 33.4, beats: 4, warp: 'out', cut: 'cut', say: 'Associations, <em>not effects.</em>' },
      // return: the numeral re-forms, then (looping) dissolves into the opening stars
      { scene: 'finale', from: 15.6, to: 19.0, beats: 10, warp: 'out', cut: 'morph', blend: 4, say: 'The score has a <em>past.</em>' },
    ],
  };
})();
