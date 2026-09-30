/* Loop mode: a highlight reel cut to a song, like a music video edit.
   Each shot plays a stretch of an existing scene (from → to, in that scene's own seconds)
   squeezed or stretched into a number of beats, so the rhythm follows the music:
   long shots while it builds, one-bar cuts as it rises, one-beat flurries at the peak.
     warp  how the scene clock moves inside the shot: linear | out (fast, then settle) | in | inOut
     cut   how the shot starts: cut (flash + punch-in) | whip (fast slide) | morph (particles
           fly between the two formations) | none (same scene continues)
     blend beats over which the submission particles travel from the previous shot
     say   the short phrase slammed onto the screen (the story mode keeps the full captions)

   Timed to Glass Animals, "The Other Side of Paradise": a fixed 128.000 BPM grid, first beat
   at 0.260 s, bar downbeats at 1.198 s + n × 1.875 s (measured from the track; no drift).
   The reel is 32 bars = 128 beats = 60.0 s and follows the song's bars 104–135
   (3:16.20 → 4:16.20), which build, rise and peak in four 8-bar phrases:
     A  bars 104–111  build       calm: stars gather into the numeral, the stacks
     B  bars 112–119  drive       the clock chapter; the spiral winds over 12 beats
     C  bars 120–127  rising      one-bar cuts: problems, attempts, retries
     D  bars 128–135  peak        punch-in on the downbeat, one-beat flurries, the numeral
   The track itself is not part of the site: load your own copy with the ♪ button and the
   reel locks to it (song below). Without music the reel still runs on the same grid. */
(function () {
  const F = window.Film;
  F.reel = {
    bpm: 128,
    // preset applied when the loaded file matches: loop exactly the 32 bars the edit follows
    song: { match: /other\s*side\s*of\s*paradise/i, title: 'The Other Side of Paradise', bpm: 128, start: 1.1975 + 104 * 1.875 },
    shots: [
      // ── A · build (bars 104–111): out of the stars, the score everyone sees ──
      { scene: 'open', from: 0.2, to: 1.0, beats: 6, cut: 'morph', blend: 5 },
      { scene: 'open', from: 1.0, to: 4.9, beats: 6, warp: 'out', say: '2,807 submissions.' },
      { scene: 'open', from: 4.9, to: 6.8, beats: 8, say: 'The score has a <em>past.</em>' },
      { scene: 'homeworks', from: 0.0, to: 3.8, beats: 6, warp: 'out', cut: 'morph', blend: 3, say: 'One dot, one submission.' },
      { scene: 'homeworks', from: 8.6, to: 10.4, beats: 6, say: 'Four homeworks.' },
      // ── B · drive (bars 112–119): when does the work happen ──
      { scene: 'time', from: 0.2, to: 3.9, beats: 4, warp: 'out', cut: 'morph', blend: 3, say: 'When?' },
      { scene: 'time', from: 8.5, to: 10.2, beats: 4, warp: 'out', cut: 'cut', say: '153 in four hours.' },
      { scene: 'time', from: 16.2, to: 17.6, beats: 4, cut: 'cut', say: '979 <em>masked.</em>' },
      { scene: 'time', from: 23.6, to: 27.8, beats: 12, warp: 'inOut', cut: 'whip', say: 'Wind it into a <em>clock.</em>' },
      { scene: 'time', from: 31.4, to: 34.4, beats: 8, warp: 'out', say: 'Saturdays and deadline nights.' },
      // ── C · rising (bars 120–127): one cut per bar ──
      { scene: 'problems', from: 0.4, to: 3.0, beats: 4, warp: 'out', cut: 'cut', say: '31 problems. All near 100.' },
      { scene: 'problems', from: 7.6, to: 10.6, beats: 4, say: 'First tries: <em>far below.</em>' },
      { scene: 'problems', from: 14.6, to: 20.0, beats: 4, warp: 'inOut', say: 'Try. Again. Again.' },
      { scene: 'problems', from: 30.4, to: 33.4, beats: 4, warp: 'out', cut: 'cut', say: '37.9 → <em>100.</em>' },
      { scene: 'attempts', from: 0.0, to: 3.8, beats: 4, warp: 'out', cut: 'morph', blend: 2, say: '1,131 first tries.' },
      { scene: 'attempts', from: 26.6, to: 32.4, beats: 4, warp: 'inOut', cut: 'whip', say: 'The cohort thins.' },
      { scene: 'retries', from: 0.2, to: 4.8, beats: 4, warp: 'out', cut: 'morph', blend: 2, say: '1,222 retries.' },
      { scene: 'retries', from: 7.2, to: 10.2, beats: 4, warp: 'inOut' },
      // ── D · peak (bars 128–135): punch on the downbeat, then flurries ──
      { scene: 'retries', from: 10.2, to: 14.2, beats: 6, cut: 'cut', say: '468 new <em>bests.</em>' },
      { scene: 'retries', from: 16.0, to: 19.4, beats: 4, warp: 'out', say: 'Instant resubmits pay off less.' },
      { scene: 'retries', from: 34.2, to: 39.6, beats: 4, warp: 'out', cut: 'cut', say: 'Some problems become <em>loops.</em>' },
      { scene: 'exam', from: 0.4, to: 3.4, beats: 2, warp: 'out', cut: 'whip', say: '26 midterm scores.' },
      { scene: 'exam', from: 8.4, to: 11.0, beats: 4, warp: 'out', cut: 'cut', say: 'One habit stands apart.' },
      { scene: 'exam', from: 25.0, to: 30.4, beats: 2, cut: 'cut', say: 'ρ = −0.48.' },
      { scene: 'exam', from: 31.2, to: 33.4, beats: 2, warp: 'out', cut: 'cut', say: 'Associations, <em>not effects.</em>' },
      // the numeral re-forms on the last bar; looping, it dissolves into the build's stars
      { scene: 'finale', from: 15.6, to: 19.0, beats: 8, warp: 'out', cut: 'morph', blend: 4, say: 'The score has a <em>past.</em>' },
    ],
  };
})();
