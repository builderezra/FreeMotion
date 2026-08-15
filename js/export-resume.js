/* FreeMotion — crash-resume for MP4 export (queue 47, the second half).
 *
 * THE PROBLEM. An export renders every frame by hand, seeking each source video to the exact time.
 * That is minutes of work for a long project, and until v7.51 all of it lived in page memory and only
 * became a file at the very end. v7.51 stopped a *gesture* from throwing it away (the beforeunload
 * guard in exporter.js). It cannot stop an actual crash — a mobile-Safari OOM kill, a tab discard, a
 * flat battery — and on a phone that is not a rare event during a long render.
 *
 * THE DESIGN, AND WHY IT IS NOT THE ONE THIS ENTRY USED TO PROMISE.
 * REQUESTS #47 said "chunk-replay resume is proven"; a later pass corrected that to "impossible as
 * stated — mp4-muxer's sample tables cannot be rehydrated, so it needs a segmented redesign". Both
 * lines are half right, and the correction was too pessimistic. It is true that you cannot reopen a
 * half-written MP4 and keep muxing into it. But you never need to: the muxer is the CHEAP end of the
 * pipeline. What costs minutes is rendering and ENCODING frames. So:
 *
 *   persist the ENCODED CHUNKS, throw the half-written file away, and on resume build a FRESH muxer
 *   and replay the saved chunks into it before carrying on.
 *
 * Re-muxing a whole export is milliseconds — it is a byte copy, not an encode. That gets crash-resume
 * with no MP4 demuxer, no new dependency, no segment-joining, and no change to the output at all: the
 * resumed file is assembled from exactly the chunks the uninterrupted one would have contained.
 *
 * WHY THE SEAM IS SAFE. The saved chunks are always a decodable PREFIX — the first is an IDR and every
 * delta references only earlier frames — and a fresh VideoEncoder opens with an IDR of its own (asked
 * for explicitly at the resume frame rather than left to chance). So the join is a plain concatenation
 * of two valid H.264 runs. Frame timestamps are `f * frameDurUs`, derived from the frame index alone,
 * so continuity across the seam is arithmetic rather than bookkeeping.
 *
 * WHAT A CRASH STILL COSTS: one batch, roughly two seconds of footage.
 *
 * WHAT IS DELIBERATELY NOT PERSISTED: audio. It is mixed and encoded in one pass at the end of the
 * export, so redoing it on resume costs a fraction of the frame loop. Persisting it would double the
 * storage for no useful saving.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  const JOB_KEY = 'xr:job';
  const PART_PREFIX = 'xr:part:';
  const FORMAT = 1;                       // bump if a record's shape changes; old jobs are then ignored, not misread

  /* A ceiling on what we are willing to leave lying in IndexedDB. At the exporter's bitrate a 1080p30
   * export is ~0.9 MB/s, so 512 MB is around nine minutes of footage. Past it we stop persisting and
   * mark the job capped: a crash then loses the render exactly as it did before this file existed,
   * which is no worse than the old behaviour, and is far better than filling a phone's storage quota
   * with the leftovers of a render nobody is going to resume. */
  const MAX_BYTES = 512 << 20;
  const BATCH_BYTES = 3 << 20;            // flush a part at ~3 MB…
  const BATCH_CHUNKS = 60;                // …or ~2 s of 30fps footage, whichever comes first
  const MAX_AGE_MS = 3 * 24 * 3600 * 1000;   // a job nobody came back for in three days is abandoned

  /* FNV-1a. Not a security hash — its whole job is "did anything about this export change?", and a
   * 32-bit digest of the scene JSON answers that. Paired with the explicit output settings in the
   * signature below, so a collision would have to also match width, height, fps, bitrate and range. */
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(16);
  }

  /* WHAT MAKES TWO EXPORTS THE SAME EXPORT. Everything that can change a single output byte has to be
   * in here, because a mismatch that slips through does not fail loudly — it splices frames of one
   * project into the middle of another. Cheap to over-include, ruinous to under-include. */
  function signature(o) {
    let doc = '';
    try { doc = JSON.stringify({ project: o.project, layers: o.layers }, FM.jsonReplacer); }
    catch (e) { doc = String(Math.random()); }   // unserialisable scene → never matches, so never resumes
    return [FORMAT, o.w, o.h, o.fps, o.bitrate, o.codec, round6(o.from), round6(o.to), o.frames,
            o.audio ? 1 : 0, hash(doc)].join('|');
  }
  function round6(n) { return Math.round((+n || 0) * 1e6) / 1e6; }

  /* An EncodedVideoChunk is a live object with no serialisable form, so copy the bytes out. `duration`
   * is nullable in the spec, and a null survives structured clone but would come back as a chunk with
   * duration null on replay — harmless for the muxer, but stored as 0 it round-trips predictably. */
  function chunkRecord(chunk) {
    const d = new Uint8Array(chunk.byteLength);
    chunk.copyTo(d);
    return { k: chunk.type, ts: chunk.timestamp || 0, du: chunk.duration || 0, d: d };
  }

  /* The decoder config (avcC) arrives as metadata on the first chunk and mp4-muxer needs it to write
   * the sample description. `description` is a BufferSource the encoder owns and may reuse, so it is
   * copied, not referenced. */
  function configRecord(meta) {
    const dc = meta && meta.decoderConfig;
    if (!dc) return null;
    let desc = null;
    if (dc.description) {
      const v = dc.description;
      const u8 = (v instanceof ArrayBuffer) ? new Uint8Array(v) : new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
      desc = u8.slice();
    }
    return { codec: dc.codec, codedWidth: dc.codedWidth, codedHeight: dc.codedHeight, description: desc };
  }

  /* Which frame the export should pick up from, read off the LAST CHUNK'S TIMESTAMP rather than off a
   * count of chunks. The count would be the obvious choice and is the wrong one: it silently assumes
   * one chunk per submitted frame, which holds for H.264 in WebCodecs today but is not something the
   * spec owes us. The timestamp was written as `f * frameDurUs` by the frame loop, so inverting it
   * recovers f whatever the encoder did in between. */
  function nextFrameAfter(records, frameDurUs) {
    if (!records || !records.length || !(frameDurUs > 0)) return 0;
    let maxTs = -1;
    for (const r of records) if (r && r.ts > maxTs) maxTs = r.ts;
    if (maxTs < 0) return 0;
    return Math.round(maxTs / frameDurUs) + 1;
  }

  /* Push saved chunks back through a fresh muxer. The decoder config rides on the FIRST chunk only —
   * exactly as it did on the original run, because that is the call mp4-muxer builds its sample
   * description from. Returns how many were replayed. */
  function replay(muxer, saved) {
    const recs = (saved && saved.records) || [];
    let n = 0;
    for (let i = 0; i < recs.length; i++) {
      const r = recs[i];
      const chunk = new EncodedVideoChunk({ type: r.k, timestamp: r.ts, duration: r.du || undefined, data: r.d });
      muxer.addVideoChunk(chunk, i === 0 && saved.config ? { decoderConfig: saved.config } : undefined);
      n++;
    }
    return n;
  }

  async function clear() {
    const st = FM.storage;
    if (!st || !st.removeMedia) return;
    /* Delete the JOB first. Everything downstream reads the job to find its parts, so a crash midway
     * through this cleanup leaves orphaned parts rather than a job pointing at parts that are gone —
     * the recoverable failure rather than the confusing one. The orphans are then swept below, and
     * anything that survives even that is swept by the next begin(). */
    try { await st.removeMedia(JOB_KEY); } catch (e) {}
    let keys = [];
    try { keys = st.listMediaKeys ? await st.listMediaKeys(PART_PREFIX) : []; } catch (e) { keys = []; }
    for (const k of keys) { try { await st.removeMedia(k); } catch (e) {} }
  }

  /* THE BOOT REAPER, and the reason it has to exist.
   *
   * These records live in the same IndexedDB store as media, and `FM.projects.pruneOrphans()` sweeps
   * that store at every boot: anything not referenced by a project layer, the live scene or the media
   * library is deleted. `xr:job` and `xr:part:N` are referenced by none of those, so the generic sweep
   * ate them — at the first boot after a crash, which is precisely the boot on which they are needed.
   * The feature therefore worked within a page session and never across the crash it was built for.
   * (Found by review, not by the tests: every test at the time either stayed inside one page or drove
   * the module directly, so nothing ever ran the boot path. The test below now does.)
   *
   * So pruneOrphans skips `xr:` and calls this instead, which is the other half of the same fix: once
   * the generic reaper is not looking after these keys, something has to. Two jobs.
   *   • A job nobody came back for within MAX_AGE_MS goes, along with its parts. load() already refuses
   *     to READ one that old, but refusing to read it is not the same as not storing it — without this
   *     up to 512 MB of encoded video would sit on the device indefinitely.
   *   • Parts numbered at or past the job's own count are the debris of a torn write and go whatever
   *     the job's age.
   * A capped job counts as stale: load() can never use one, so keeping it is pure cost. */
  async function sweep() {
    if (FM._exporting) return;          // never reap underneath a running export
    const st = FM.storage;
    if (!st || !st.readMedia) return;
    let job = null;
    try { job = await st.readMedia(JOB_KEY); } catch (e) { job = null; }
    const stale = !job || job.v !== FORMAT || job.capped || !job.updatedAt ||
                  (Date.now() - job.updatedAt) > MAX_AGE_MS || !(job.parts > 0);
    if (stale) { await clear(); return; }
    let keys = [];
    try { keys = st.listMediaKeys ? await st.listMediaKeys(PART_PREFIX) : []; } catch (e) { keys = []; }
    for (const k of keys) {
      const i = parseInt(k.slice(PART_PREFIX.length), 10);
      if (!(i >= 0) || i >= job.parts) { try { await st.removeMedia(k); } catch (e) {} }
    }
  }

  async function load(sig) {
    const st = FM.storage;
    if (!st || !st.readMedia) return null;
    let job = null;
    try { job = await st.readMedia(JOB_KEY); } catch (e) { return null; }
    if (!job || job.v !== FORMAT || job.sig !== sig || job.capped) return null;
    if (!(job.parts > 0)) return null;
    if (!job.updatedAt || (Date.now() - job.updatedAt) > MAX_AGE_MS) return null;
    const records = [];
    let partsRead = 0;
    for (let i = 0; i < job.parts; i++) {
      let part = null;
      try { part = await st.readMedia(PART_PREFIX + i); } catch (e) { part = null; }
      /* A missing part TRUNCATES rather than fails. The parts before it are still a valid decodable
       * prefix, so half a resume beats none — and this is the shape a torn write actually takes. */
      if (!part || !part.chunks || !part.chunks.length) break;
      for (const c of part.chunks) records.push(c);
      partsRead++;
    }
    if (!records.length) return null;
    if (records[0].k !== 'key') return null;   // a prefix that does not open on a keyframe is not decodable
    /* `parts` is reported as the number actually READ, not the number the job claimed. They differ
     * exactly when a part was torn, and the recorder must then append at the first free index — using
     * the claimed count would leave a permanent hole that every later load() truncates at. */
    return { records: records, config: job.config || null, bytes: job.bytes || 0, parts: partsRead };
  }

  /* The write side. Owns its own batching so the frame loop only has to say "here is a chunk".
   *
   * ORDERING IS THE WHOLE TRICK: the part is written BEFORE the job that counts it. A crash in between
   * leaves a part nobody reads, which costs a little space and nothing else. The other order would
   * leave a job claiming a part that was never written — which load() would have to detect, and which
   * is exactly the class of bug this feature exists to avoid.
   *
   * Every failure here is soft. Persistence is insurance on the export, never a condition of it: a
   * full quota, a private-mode IndexedDB, a browser that refuses the write — all of them stop the
   * recording and let the export run exactly as it did before. */
  function createRecorder(sig, opts) {
    const st = FM.storage;
    const o = opts || {};
    const maxBytes = o.maxBytes || MAX_BYTES;
    const batchBytes = o.batchBytes || BATCH_BYTES;
    const batchChunks = o.batchChunks || BATCH_CHUNKS;
    let buf = [], bufBytes = 0;
    /* TWO counters, not one. `nextIdx` is the slot the next part will occupy and is claimed the moment
     * a batch is handed over; `written` is how many are confirmed on disk, contiguous from zero, and is
     * the only number the job record ever reports. Collapsing them into one would mean a failed write
     * leaving a job that counts a part nobody ever stored. */
    let nextIdx = o.parts || 0, written = o.parts || 0;
    let bytes = o.bytes || 0;
    let config = o.config || null;
    let capped = false, dead = !st || !st.writeMedia;
    let chain = Promise.resolve();         // serialises writes so parts land in order

    async function writeJob() {
      const ok = await st.writeMedia(JOB_KEY, {
        v: FORMAT, sig: sig, parts: written, bytes: bytes, config: config,
        capped: capped, updatedAt: Date.now(),
      });
      if (!ok) dead = true;
    }

    /* The batch is taken SYNCHRONOUSLY, here, and only the write of that fixed snapshot is queued.
     * Reading `buf` inside the queued task instead looks equivalent and is not: several batches can be
     * handed over within one turn of the event loop, and the first task to run would then swallow all
     * of them into one oversized part while the rest wrote nothing. Everything still works — but the
     * part size, and with it what a crash costs, quietly stops being what the caller asked for. The
     * torn-part test caught exactly that, in its control line rather than its subject. */
    function handOff() {
      if (dead || !buf.length) return;
      const chunks = buf, n = bufBytes, idx = nextIdx;
      buf = []; bufBytes = 0; nextIdx++;
      chain = chain.then(async () => {
        if (dead) return;
        const ok = await st.writeMedia(PART_PREFIX + idx, { chunks: chunks });
        if (!ok) { dead = true; return; }  // quota or worse — stop recording, let the export finish
        written = idx + 1; bytes += n;
        if (bytes >= maxBytes) capped = true;
        await writeJob();
      }, () => {});
    }

    return {
      /* Called from the encoder's output callback, which must stay fast — so this only buffers, and
       * hands the actual write to the serialised chain when a batch fills. Not awaited by the caller. */
      add(chunk, meta) {
        if (dead || capped) return;
        if (!config) { const c = configRecord(meta); if (c) { config = c; } }
        let rec;
        try { rec = chunkRecord(chunk); } catch (e) { dead = true; return; }
        buf.push(rec); bufBytes += rec.d.byteLength;
        if (buf.length >= batchChunks || bufBytes >= batchBytes) this.flush();
      },
      flush() { handOff(); return chain; },
      /* Shut the recorder down and hand back its outstanding writes to await. Without this there is a
       * genuine race on Cancel: clear() deletes the job, and a flush still queued from the last frames
       * then lands afterwards and writes a NEW job for an export that no longer exists — leftovers
       * that would sit in the store for three days and could be replayed into a later render. */
      stop() { dead = true; buf = []; bufBytes = 0; return chain; },
      /* Awaited once at the end of the frame loop so the last partial batch is not the one thing left
       * unsaved — the export is about to finalize, but if THAT is what crashes, a resume should still
       * have every frame. */
      settle() { return this.flush(); },
      get parts() { return written; },
      get bytes() { return bytes; },
      get capped() { return capped; },
      get recording() { return !dead && !capped; },
    };
  }

  FM.exportResume = {
    JOB_KEY: JOB_KEY, PART_PREFIX: PART_PREFIX, FORMAT: FORMAT, MAX_BYTES: MAX_BYTES,
    signature: signature,
    chunkRecord: chunkRecord,
    configRecord: configRecord,
    nextFrameAfter: nextFrameAfter,
    replay: replay,
    createRecorder: createRecorder,
    load: load,
    clear: clear,
    sweep: sweep,
  };
})(window.FM);
