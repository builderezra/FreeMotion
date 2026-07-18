/* FreeMotion — store-only ZIP writer.
 * Method 0 (no compression): our payloads are PNG frames, already compressed, so deflating them
 * again would only add code + CPU for near-zero gain. Kept dependency-free (no jszip) per house rules.
 * Layout follows the PKZIP APPNOTE: local file headers + stored data, then central directory, then EOCD.
 * All multi-byte fields little-endian.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  // Standard IEEE 802.3 CRC-32 (reflected, poly 0xEDB88320), table built once.
  const CRC_TABLE = (function () {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  // Reject zip-slip / absolute paths: strip leading slashes, drop any ".." segment, forbid backslashes.
  function sanitizeName(name) {
    let s = String(name == null ? '' : name);
    s = s.replace(/\\/g, '/');          // backslashes become forward slashes
    s = s.replace(/^\/+/, '');          // no absolute paths
    const parts = s.split('/').filter(function (p) {
      return p !== '' && p !== '.' && p !== '..';
    });
    s = parts.join('/');
    return s || 'file';
  }

  // UTF-8 encode a name; set the language-encoding (bit 11) flag when any byte is non-ASCII.
  function encodeName(name) {
    const bytes = new TextEncoder().encode(name);
    let utf8 = false;
    for (let i = 0; i < bytes.length; i++) { if (bytes[i] & 0x80) { utf8 = true; break; } }
    return { bytes: bytes, utf8: utf8 };
  }

  // DOS date/time from a JS Date. Year floored at 1980 (DOS epoch); fields are bit-packed.
  function dosDateTime(date) {
    const y = date.getFullYear();
    let dosDate = 0, dosTime = 0;
    if (y >= 1980) {
      dosDate = (((y - 1980) & 0x7F) << 9) | (((date.getMonth() + 1) & 0x0F) << 5) | (date.getDate() & 0x1F);
      dosTime = ((date.getHours() & 0x1F) << 11) | ((date.getMinutes() & 0x3F) << 5) | ((date.getSeconds() >> 1) & 0x1F);
    }
    return { date: dosDate, time: dosTime };
  }

  function create() {
    const chunks = [];      // Uint8Array pieces, concatenated at finish()
    const entries = [];     // per-file bookkeeping for the central directory
    let offset = 0;         // running byte offset from the start of the archive

    function push(u8) { chunks.push(u8); offset += u8.length; }

    function add(name, bytes) {
      const clean = sanitizeName(name);
      const nm = encodeName(clean);
      const data = (bytes instanceof Uint8Array) ? bytes : new Uint8Array(bytes);
      const crc = crc32(data);
      const dt = dosDateTime(new Date());
      const flags = nm.utf8 ? 0x0800 : 0;
      const localOffset = offset;

      // ---- Local file header (signature 0x04034b50) ----
      const header = new Uint8Array(30 + nm.bytes.length);
      const dv = new DataView(header.buffer);
      dv.setUint32(0, 0x04034b50, true);   // local file header signature
      dv.setUint16(4, 20, true);           // version needed to extract (2.0)
      dv.setUint16(6, flags, true);        // general purpose bit flag
      dv.setUint16(8, 0, true);            // compression method: 0 = stored
      dv.setUint16(10, dt.time, true);     // last mod file time
      dv.setUint16(12, dt.date, true);     // last mod file date
      dv.setUint32(14, crc, true);         // CRC-32
      dv.setUint32(18, data.length, true); // compressed size (== uncompressed, stored)
      dv.setUint32(22, data.length, true); // uncompressed size
      dv.setUint16(26, nm.bytes.length, true); // file name length
      dv.setUint16(28, 0, true);           // extra field length
      header.set(nm.bytes, 30);

      push(header);
      push(data);

      entries.push({
        nameBytes: nm.bytes,
        flags: flags,
        crc: crc,
        size: data.length,
        dosDate: dt.date,
        dosTime: dt.time,
        localOffset: localOffset
      });
    }

    function finish() {
      const cdStart = offset;

      // ---- Central directory ----
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const rec = new Uint8Array(46 + e.nameBytes.length);
        const dv = new DataView(rec.buffer);
        dv.setUint32(0, 0x02014b50, true);   // central file header signature
        dv.setUint16(4, 20, true);           // version made by
        dv.setUint16(6, 20, true);           // version needed to extract
        dv.setUint16(8, e.flags, true);      // general purpose bit flag
        dv.setUint16(10, 0, true);           // compression method: stored
        dv.setUint16(12, e.dosTime, true);   // last mod file time
        dv.setUint16(14, e.dosDate, true);   // last mod file date
        dv.setUint32(16, e.crc, true);       // CRC-32
        dv.setUint32(20, e.size, true);      // compressed size
        dv.setUint32(24, e.size, true);      // uncompressed size
        dv.setUint16(28, e.nameBytes.length, true); // file name length
        dv.setUint16(30, 0, true);           // extra field length
        dv.setUint16(32, 0, true);           // file comment length
        dv.setUint16(34, 0, true);           // disk number start
        dv.setUint16(36, 0, true);           // internal file attributes
        dv.setUint32(38, 0, true);           // external file attributes
        dv.setUint32(42, e.localOffset, true); // offset of local header
        rec.set(e.nameBytes, 46);
        push(rec);
      }

      const cdSize = offset - cdStart;

      // ---- End of central directory record (signature 0x06054b50) ----
      const eocd = new Uint8Array(22);
      const dv = new DataView(eocd.buffer);
      dv.setUint32(0, 0x06054b50, true);        // EOCD signature
      dv.setUint16(4, 0, true);                 // number of this disk
      dv.setUint16(6, 0, true);                 // disk where CD starts
      dv.setUint16(8, entries.length, true);    // CD records on this disk
      dv.setUint16(10, entries.length, true);   // total CD records
      dv.setUint32(12, cdSize, true);           // size of central directory
      dv.setUint32(16, cdStart, true);          // offset of central directory
      dv.setUint16(20, 0, true);                // comment length
      push(eocd);

      return new Blob(chunks, { type: 'application/zip' });
    }

    return { add: add, finish: finish };
  }

  FM.zipWrite = { create: create, crc32: crc32, sanitizeName: sanitizeName };

})(window.FM);
