/* Loop mode: a highlight reel cut to a song, like a music video edit. One reel per content
   route, so Core's loop never shows a Showcase-only result. A highlight reel is an edit, not
   proof that every figure was shown: the complete routes are in Presenter / Auto.
   Each shot plays a stretch of an existing scene (from → to, in that scene's own seconds)
   squeezed or stretched into a number of beats, so the rhythm follows the music:
   long shots while it builds, one-bar cuts as it rises, one-beat flurries at the peak.
     warp  how the scene clock moves inside the shot: linear | out (fast, then settle) | in | inOut
     cut   how the shot starts: cut (flash + punch-in) | whip (fast slide) | morph (particles
           fly between the two formations) | none (same scene continues)
     blend beats over which the submission particles travel from the previous shot
     say   the short phrase slammed onto the screen (Presenter keeps the full captions)

   Timed to Glass Animals, "The Other Side of Paradise": a fixed 128.000 BPM grid, first beat
   at 0.260 s, bar downbeats at 1.198 s + n × 1.875 s (measured from the track; no drift).
   Each reel is 32 bars = 128 beats = 60.0 s and follows the song's bars 104–135
   (3:16.20 → 4:16.20), which build, rise and peak in four 8-bar phrases:
     A  bars 104–111  build       calm: stars gather into the numeral; the newest homework
     B  bars 112–119  drive       the timing figure; the spiral winds over 12 beats
     C  bars 120–127  rising      one-bar cuts: problems, attempts, retries
     D  bars 128–135  peak        punch-in on the downbeat, one- and two-beat flurries, the numeral
   The track itself is not part of the site: load your own copy with the ♪ button and the
   reel locks to it (song below). Without music the reel still runs on the same grid.
   tests/test_routes.cjs checks that every shot stays inside its route's chapters. */
(function () {
  const F = window.Film;
  const song = { match: /other\s*side\s*of\s*paradise/i, title: 'The Other Side of Paradise', bpm: 128, start: 1.1975 + 104 * 1.875 };
  F.reels = {
    core: {
      bpm: 128, song,
      shots: [
        // ── A · build: out of the stars, the score everyone sees, and what is new ──
        { scene: 'open', from: 0.2, to: 1.0, beats: 6, cut: 'morph', blend: 5 },
        { scene: 'open', from: 1.0, to: 4.9, beats: 6, warp: 'out', say: '2,807 submissions.' },
        { scene: 'open', from: 4.9, to: 6.8, beats: 8, say: 'The score has a <em>past.</em>' },
        { scene: 'open', from: 13.0, to: 15.4, beats: 6, warp: 'out', say: 'Now through <em>HW4.</em>' },
        { scene: 'time', from: 0.2, to: 3.9, beats: 6, warp: 'out', cut: 'morph', blend: 3, say: 'When?' },
        // ── B · drive: Figure 01 ──
        { scene: 'time', from: 8.5, to: 10.2, beats: 4, warp: 'out', cut: 'cut', say: '153 in four hours.' },
        { scene: 'time', from: 16.2, to: 17.6, beats: 4, cut: 'cut', say: '979 <em>withheld.</em>' },
        { scene: 'time', from: 23.6, to: 27.8, beats: 12, warp: 'inOut', cut: 'whip', say: 'Wind it into a <em>clock.</em>' },
        { scene: 'time', from: 31.4, to: 34.4, beats: 4, warp: 'out', say: 'Deadline nights.' },
        { scene: 'time', from: 40.4, to: 44.6, beats: 8, warp: 'out', say: 'Many people, or <em>many times?</em>' },
        // ── C · rising: Figures 03 and 11, one cut per bar ──
        { scene: 'problems', from: 0.4, to: 3.0, beats: 4, warp: 'out', cut: 'cut', say: '31 problems. All near 100.' },
        { scene: 'problems', from: 7.6, to: 10.6, beats: 4, say: 'First tries: <em>far below.</em>' },
        { scene: 'problems', from: 14.6, to: 20.0, beats: 4, warp: 'inOut', say: 'Try. Again. Again.' },
        { scene: 'problems', from: 30.4, to: 34.0, beats: 4, warp: 'out', cut: 'cut', say: '10 of 31 still <em>short.</em>' },
        { scene: 'retries', from: 0.2, to: 4.8, beats: 4, warp: 'out', cut: 'morph', blend: 2, say: '1,222 retries.' },
        { scene: 'retries', from: 7.2, to: 10.2, beats: 4, warp: 'inOut' },
        { scene: 'retries', from: 10.2, to: 14.2, beats: 8, cut: 'cut', say: '468 new <em>bests.</em>' },
        // ── D · peak: Figures 11, 12 and 06, then the numeral ──
        { scene: 'retries', from: 16.0, to: 19.4, beats: 4, warp: 'out', say: 'Instant resubmits: <em>31.6%.</em>' },
        { scene: 'retries', from: 24.4, to: 28.4, beats: 4, warp: 'out', cut: 'cut', say: 'Rates by homework and gap.' },
        { scene: 'retries', from: 52.2, to: 55.8, beats: 4, warp: 'out', cut: 'whip', say: 'Phase by phase.' },
        { scene: 'retries', from: 61.2, to: 65.2, beats: 4, warp: 'out', say: 'One scale, <em>0–100%.</em>' },
        { scene: 'exam', from: 0.4, to: 5.0, beats: 2, warp: 'out', cut: 'whip', say: 'HW4 excluded.' },
        { scene: 'exam', from: 18.2, to: 21.4, beats: 2, warp: 'out', cut: 'cut', say: 'ρ = −0.48.' },
        { scene: 'exam', from: 33.0, to: 36.4, beats: 2, warp: 'out', cut: 'cut', say: 'Checked three ways.' },
        { scene: 'exam', from: 36.4, to: 39.0, beats: 2, warp: 'out', say: 'Associations, <em>not effects.</em>' },
        // the numeral re-forms on the last bar; looping, it dissolves into the build's stars
        { scene: 'finale', from: 15.6, to: 19.0, beats: 8, warp: 'out', cut: 'morph', blend: 4, say: 'The score has a <em>past.</em>' },
      ],
    },
    showcase: {
      bpm: 128, song,
      shots: [
        // ── A · build ──
        { scene: 'open', from: 0.2, to: 1.0, beats: 6, cut: 'morph', blend: 5 },
        { scene: 'open', from: 1.0, to: 4.9, beats: 6, warp: 'out', say: '2,807 submissions.' },
        { scene: 'open', from: 4.9, to: 6.8, beats: 4, say: 'The score has a <em>past.</em>' },
        { scene: 'open', from: 13.0, to: 15.0, beats: 4, warp: 'out', say: 'Now through <em>HW4.</em>' },
        { scene: 'homeworks', from: 0.0, to: 3.8, beats: 6, warp: 'out', cut: 'morph', blend: 3, say: 'One dot, one submission.' },
        { scene: 'homeworks', from: 8.6, to: 10.4, beats: 6, say: 'Four homeworks.' },
        // ── B · drive: when does the work happen ──
        { scene: 'time', from: 0.2, to: 3.9, beats: 4, warp: 'out', cut: 'morph', blend: 3, say: 'When?' },
        { scene: 'time', from: 8.5, to: 10.2, beats: 4, warp: 'out', cut: 'cut', say: '153 in four hours.' },
        { scene: 'time', from: 16.2, to: 17.6, beats: 4, cut: 'cut', say: '979 <em>withheld.</em>' },
        { scene: 'time', from: 23.6, to: 27.8, beats: 12, warp: 'inOut', cut: 'whip', say: 'Wind it into a <em>clock.</em>' },
        { scene: 'time', from: 40.4, to: 44.6, beats: 8, warp: 'out', say: 'Many people, or <em>many times?</em>' },
        // ── C · rising: one cut per bar ──
        { scene: 'problems', from: 0.4, to: 3.0, beats: 4, warp: 'out', cut: 'cut', say: '31 problems. All near 100.' },
        { scene: 'problems', from: 7.6, to: 10.6, beats: 4, say: 'First tries: <em>far below.</em>' },
        { scene: 'problems', from: 14.6, to: 20.0, beats: 4, warp: 'inOut', say: 'Try. Again. Again.' },
        { scene: 'problems', from: 40.4, to: 43.4, beats: 4, warp: 'out', cut: 'cut', say: '37.9 → <em>100.</em>' },
        { scene: 'attempts', from: 0.0, to: 3.8, beats: 4, warp: 'out', cut: 'morph', blend: 2, say: '1,131 first tries.' },
        { scene: 'attempts', from: 26.8, to: 32.4, beats: 4, warp: 'inOut', cut: 'whip', say: 'The cohort thins.' },
        { scene: 'retries', from: 0.2, to: 4.8, beats: 4, warp: 'out', cut: 'morph', blend: 2, say: '1,222 retries.' },
        { scene: 'retries', from: 7.2, to: 10.2, beats: 4, warp: 'inOut' },
        // ── D · peak ──
        { scene: 'retries', from: 10.2, to: 14.2, beats: 6, cut: 'cut', say: '468 new <em>bests.</em>' },
        { scene: 'retries', from: 35.2, to: 40.0, beats: 4, warp: 'out', cut: 'cut', say: 'Some problems become <em>loops.</em>' },
        { scene: 'retries', from: 61.2, to: 65.2, beats: 4, warp: 'out', cut: 'whip', say: 'Progress, phase by phase.' },
        { scene: 'exam', from: 10.2, to: 13.2, beats: 2, warp: 'out', cut: 'whip', say: '26 exam scores.' },
        { scene: 'exam', from: 18.2, to: 21.4, beats: 4, warp: 'out', cut: 'cut', say: 'ρ = −0.48.' },
        { scene: 'exam', from: 50.2, to: 54.6, beats: 2, warp: 'out', cut: 'cut', say: '11 of 26 on Course Pulse.' },
        { scene: 'exam', from: 69.2, to: 72.2, beats: 2, warp: 'out', cut: 'cut', say: 'Associations, <em>not effects.</em>' },
        { scene: 'finale', from: 15.6, to: 19.0, beats: 8, warp: 'out', cut: 'morph', blend: 4, say: 'The score has a <em>past.</em>' },
      ],
    },
  };
})();
