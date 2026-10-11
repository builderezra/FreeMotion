/* AX1: the REAL FM.exporter.run on this container's codec path (VP9 + Opus), by rewriting codec names at the encoder and the muxer. */
const out = { steps: [] };
const RealVE = window.VideoEncoder, RealAE = window.AudioEncoder, RealMux = window.Mp4Muxer;
const mapV = c => (c && /^avc/.test(c.codec)) ? { codec: 'vp09.00.10.08', width: c.width, height: c.height, bitrate: c.bitrate, framerate: c.framerate } : c;
const mapA = c => (c && /^mp4a/.test(c.codec)) ? { codec: 'opus', sampleRate: c.sampleRate, numberOfChannels: c.numberOfChannels, bitrate: c.bitrate } : c;
class VE extends RealVE { configure(c) { return super.configure(mapV(c)); } static isConfigSupported(c) { return RealVE.isConfigSupported(mapV(c)); } }
const ZERO = false;
class AE extends RealAE { configure(c) { return super.configure(mapA(c)); } static isConfigSupported(c) { return RealAE.isConfigSupported(mapA(c)); } }
class ZE { constructor(init) { this.init = init; this.state = 'unconfigured'; this.encodeQueueSize = 0; } static isConfigSupported(c) { return Promise.resolve({ supported: true, config: c }); } configure() { this.state = 'configured'; } encode(d) { try { d.close && d.close(); } catch (e) {} } flush() { return Promise.resolve(); } close() { this.state = 'closed'; } reset() {} }
window.VideoEncoder = VE; window.AudioEncoder = ZERO ? ZE : AE;
class Mux extends RealMux.Muxer { constructor(o) { if (o.video) o.video = Object.assign({}, o.video, { codec: 'vp9' }); if (o.audio) o.audio = Object.assign({}, o.audio, { codec: 'opus' }); super(o); } }
window.Mp4Muxer = { Muxer: Mux, ArrayBufferTarget: RealMux.ArrayBufferTarget, StreamTarget: RealMux.StreamTarget, FileSystemWritableFileStreamTarget: RealMux.FileSystemWritableFileStreamTarget };
const reports = [], toasts = []; const toast0 = FM.toast; FM.toast = m => { toasts.push(String(m)); return toast0.apply(FM, arguments); };
try {
  const P = FM.scene.project; const proj = await FM.projects.create({ name: 'AX1', width: 320, height: 240 });
  const getFile = async (n, type) => new File([await (await fetch('/zz-ax1/' + n)).arrayBuffer()], n, { type: type });
  const vrec = await FM.loadVideoFile(await getFile('clip.webm', 'video/webm'));
  FM.addMediaLayer(vrec); await new Promise(r => setTimeout(r, 500));
  const vlayer = FM.scene.layers[FM.scene.layers.length - 1];
  const srec = await FM.loadVideoFile(await getFile('song.wav', 'audio/wav'));
  FM.addMediaLayer(srec); await new Promise(r => setTimeout(r, 500));
  const slayer = FM.scene.layers[FM.scene.layers.length - 1];
  out.layers = FM.scene.layers.map(l => ({ type: l.type, name: l.name, start: l.start, dur: l.duration, muted: l.muted, vol: JSON.stringify(l.volume), audioOnly: l.audioOnly }));
  out.media = FM.scene.layers.map(l => { const m = FM.media.get(l.id); return m && { hasBuf: !!m.audioBuffer, dur: m.duration, kind: m.kind, w: m.width, h: m.height }; });
  FM.scene.project.duration = 3;
  let ready = null;
  await FM.exporter.run({ fps: 10, scale: 1, name: 'ax1', onReady: async r => { ready = r; } });
  out.ready = ready && { hasAudio: ready.hasAudio, audioDropped: ready.audioDropped, bytes: ready.blob && ready.blob.size, keys: Object.keys(ready) };
  out.dropped = FM._audioTrackDropped || null;
  out.toasts = toasts.slice(0, 6);
  out.report = localStorage.getItem('fm.lastExportReport');
  if (ready && ready.blob) {
    const buf = new Uint8Array(await ready.blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
    window.__blob = btoa(s); out.b64len = window.__blob.length;
  }
} catch (e) { out.error = String(e && e.stack || e).slice(0, 800); }
return out;
