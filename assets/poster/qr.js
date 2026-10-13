/* Minimal QR Code encoder for the poster's site link: byte mode, error-correction level M,
   versions 1–6 (up to 106 bytes). Returns a square matrix of booleans (true = dark module).
   No dependency; tests/test_poster.cjs checks its structure and a known format word. */
(function () {
  const root = typeof window !== 'undefined' ? window : globalThis;

  // level M, per version: [error-correction codewords per block, blocks, data codewords per block]
  const BLOCKS = { 1: [10, 1, 16], 2: [16, 1, 28], 3: [26, 1, 44], 4: [18, 2, 32], 5: [24, 2, 43], 6: [16, 4, 27] };

  // GF(256) arithmetic, reducing polynomial x^8 + x^4 + x^3 + x^2 + 1
  const mul = (x, y) => {
    let z = 0;
    for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; }
    return z;
  };
  const divisor = (degree) => {
    const out = new Array(degree).fill(0); out[degree - 1] = 1;
    let r = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < degree; j++) { out[j] = mul(out[j], r); if (j + 1 < degree) out[j] ^= out[j + 1]; }
      r = mul(r, 2);
    }
    return out;
  };
  const remainder = (data, div) => {
    const out = new Array(div.length).fill(0);
    for (const b of data) {
      const factor = b ^ out.shift(); out.push(0);
      div.forEach((c, i) => { out[i] ^= mul(c, factor); });
    }
    return out;
  };

  function codewords(bytes, version) {
    const [ec, blocks, perBlock] = BLOCKS[version], capacity = blocks * perBlock;
    const bits = [];
    const push = (value, n) => { for (let i = n - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
    push(4, 4); push(bytes.length, 8); bytes.forEach((b) => push(b, 8));
    push(0, Math.min(4, capacity * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((v, b) => (v << 1) | b, 0));
    for (let pad = 0xec; data.length < capacity; pad ^= 0xec ^ 0x11) data.push(pad);
    const div = divisor(ec), parts = [];
    for (let b = 0; b < blocks; b++) {
      const chunk = data.slice(b * perBlock, (b + 1) * perBlock);
      parts.push({ chunk, check: remainder(chunk, div) });
    }
    const out = [];
    for (let i = 0; i < perBlock; i++) parts.forEach((p) => out.push(p.chunk[i]));
    for (let i = 0; i < ec; i++) parts.forEach((p) => out.push(p.check[i]));
    return out;
  }

  const MASKS = [
    (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];

  /** 15-bit format word for level M and the given mask (BCH remainder, then the fixed XOR mask). */
  function formatBits(mask) {
    let rem = mask; // level M contributes the two bits 00
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    return ((mask << 10) | rem) ^ 0x5412;
  }

  function penalty(m) {
    const n = m.length;
    let score = 0, dark = 0;
    const lines = [];
    for (let i = 0; i < n; i++) { lines.push(m[i]); lines.push(m.map((row) => row[i])); }
    for (const line of lines) {
      for (let i = 0, run = 1; i < n; i++, run++) {
        if (i + 1 < n && line[i + 1] === line[i]) continue;
        if (run >= 5) score += run - 2;
        run = 0;
      }
      const s = line.map((v) => (v ? 1 : 0)).join('');
      for (const pat of ['10111010000', '00001011101']) for (let at = s.indexOf(pat); at >= 0; at = s.indexOf(pat, at + 1)) score += 40;
    }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (m[y][x]) dark++;
      if (x + 1 < n && y + 1 < n && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) score += 3;
    }
    return score + 10 * Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n));
  }

  function encode(text) {
    const bytes = Array.from(new TextEncoder().encode(text));
    const version = Object.keys(BLOCKS).map(Number).find((v) => bytes.length <= BLOCKS[v][1] * BLOCKS[v][2] - 2);
    if (!version) throw new Error('QR: text is longer than this encoder supports (106 bytes)');
    const n = 17 + 4 * version;
    const dark = Array.from({ length: n }, () => new Array(n).fill(false));
    const fixed = Array.from({ length: n }, () => new Array(n).fill(false));
    const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < n && y < n) { dark[y][x] = v; fixed[y][x] = true; } };

    // finder patterns with their separators, timing lines, alignment pattern, format areas
    for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]])
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        set(cx + dx, cy + dy, d !== 2 && d !== 4);
      }
    for (let i = 8; i < n - 8; i++) { set(i, 6, i % 2 === 0); set(6, i, i % 2 === 0); }
    if (version > 1)
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(n - 7 + dx, n - 7 + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    const drawFormat = (mask) => {
      const bits = formatBits(mask), bit = (i) => ((bits >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) set(8, i, bit(i));
      set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) set(n - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) set(8, n - 15 + i, bit(i));
      set(8, n - 8, true);
    };
    drawFormat(0);

    // zigzag placement, two columns at a time from the bottom-right corner
    const data = codewords(bytes, version);
    let k = 0;
    for (let right = n - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < n; vert++) for (let j = 0; j < 2; j++) {
        const x = right - j, y = ((right + 1) & 2) === 0 ? n - 1 - vert : vert;
        if (fixed[y][x]) continue;
        dark[y][x] = k < data.length * 8 && ((data[k >>> 3] >>> (7 - (k & 7))) & 1) === 1;
        k++;
      }
    }

    // apply the mask with the lowest penalty score
    let best = null;
    for (let mask = 0; mask < 8; mask++) {
      const m = dark.map((row, y) => row.map((v, x) => (fixed[y][x] ? v : v !== MASKS[mask](x, y))));
      const keep = dark.map((row) => row.slice());
      drawFormat(mask);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (fixed[y][x]) m[y][x] = dark[y][x];
      const score = penalty(m);
      if (!best || score < best.score) best = { score, mask, modules: m };
      keep.forEach((row, y) => { dark[y] = row; });
    }
    return { size: n, version, mask: best.mask, modules: best.modules };
  }

  root.PosterQR = { encode, formatBits };
})();
