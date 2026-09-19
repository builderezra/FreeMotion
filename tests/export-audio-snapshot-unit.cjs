// Actual mixer scheduling and PCM controls; no browser or audio codec is run here.
// Run: node --test tests/export-audio-snapshot-unit.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const source = Object.fromEntries(['scene.js','exporter.js'].map(name =>
  [name,fs.readFileSync(path.join(root,'js',name),'utf8')]));

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve=done; });
  return {promise,resolve};
}
function buffer(channels, length, sampleRate) {
  const data = Array.from({length:channels}, () => new Float32Array(length));
  return {numberOfChannels:channels,length,sampleRate,duration:length/sampleRate,
    getChannelData(channel) { return data[channel]; }};
}
function signal(fn, duration=1) {
  const result=buffer(1,Math.round(duration*8000),8000),data=result.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=fn(i/8000);
  return result;
}
function gainAt(param,time) {
  let value=param.value, previousTime=0;
  for(const event of param.events) {
    if(time<event.time) {
      if(event.kind==='ramp' && event.time>previousTime)
        return value+(event.value-value)*(time-previousTime)/(event.time-previousTime);
      return value;
    }
    value=event.value; previousTime=event.time;
  }
  return value;
}

function harness(options={}) {
  const contexts=[];
  // Only the dry buffer-source -> gain -> destination path is modeled. The real mixer still
  // trims/resamples source PCM, computes overlap and fades, schedules gain, and scans/limits output.
  class OfflineAudioContext {
    constructor(channels,length,sampleRate) {
      Object.assign(this,{channels,length,sampleRate,sources:[],gains:[],destination:{}});
      contexts.push(this);
    }
    createBuffer(...args) { return buffer(...args); }
    createBufferSource() {
      const node={buffer:null,connect(to) { this.output=to; },
        start(when,offset,duration) { this.play={when,offset,duration}; }};
      this.sources.push(node); return node;
    }
    createGain() {
      const gain={value:1,events:[],
        setValueAtTime(value,time) { this.events.push({kind:'set',value,time}); },
        linearRampToValueAtTime(value,time) { this.events.push({kind:'ramp',value,time}); }};
      const node={gain,connect(to) { this.output=to; },disconnect() { this.output=null; }};
      this.gains.push(node); return node;
    }
    async startRendering() {
      if(options.beforeRender) await options.beforeRender(this);
      const result=buffer(this.channels,this.length,this.sampleRate);
      for(const node of this.sources) {
        assert(node.play && node.output && node.output.output===this.destination,
          'mock accepts only the actual dry source/gain/destination graph');
        const {when,offset,duration}=node.play,ab=node.buffer;
        for(let outIndex=0;outIndex<this.length;outIndex++) {
          const time=outIndex/this.sampleRate;
          if(time<when || time>=when+duration)continue;
          const pos=(time-when+offset)*ab.sampleRate;
          const index=Math.floor(pos),fraction=pos-index;
          if(index<0 || index>=ab.length)continue;
          const gain=gainAt(node.output.gain,time);
          for(let channel=0;channel<this.channels;channel++) {
            const input=ab.getChannelData(Math.min(channel,ab.numberOfChannels-1));
            const a=input[index],b=input[Math.min(index+1,ab.length-1)];
            result.getChannelData(channel)[outIndex]+=(a+(b-a)*fraction)*gain;
          }
        }
      }
      return result;
    }
  }
  const sandbox={performance,OfflineAudioContext,console:{warn() {},log() {}},
    addEventListener() {},document:{getElementById() { return null; }}};
  sandbox.window=sandbox;
  const context=vm.createContext(sandbox);
  for(const name of ['scene.js','exporter.js'])vm.runInContext(source[name],context,{filename:name});
  const FM=context.FM; FM.media=new Map();
  const decodedFiles=[];
  FM.decodeAudio=async file => {
    decodedFiles.push(file);
    if(options.decode) return options.decode(file);
    assert(file && file.pcm,'fixture must provide decoded PCM'); return file.pcm;
  };
  function scene(overrides={}) {
    const s=FM.newScene();s.project.duration=1;
    const layer=FM.makeLayer('video',{name:'Sound',start:0.25,duration:0.5});
    Object.assign(layer,{trimStart:0.25,volume:0.5},overrides);
    s.layers=[layer];FM.scene=s;return s;
  }
  return {FM,contexts,decodedFiles,scene};
}
function detach(FM,scene) { return JSON.parse(JSON.stringify(scene,FM.jsonReplacer)); }
function captureRecords(FM,scene) {
  return new Map(scene.layers.map(layer => {
    const rec=FM.media.get(layer.id);
    return [layer.id,rec ? {file:rec.file,audioBuffer:rec.audioBuffer} : undefined];
  }));
}
function sampleAt(mix,time,expected,label) {
  assert(mix && mix.audioBuffer,'mixer must return its audio buffer');
  const pcm=mix.audioBuffer;
  assert(pcm.numberOfChannels>0 && pcm.length>0,'PCM assertions must inspect actual channels');
  for(let channel=0;channel<pcm.numberOfChannels;channel++) {
    const actual=pcm.getChannelData(channel)[Math.round(time*pcm.sampleRate)];
    assert(Math.abs(actual-expected)<1e-6,`${label}: channel ${channel}, ${actual} != ${expected}`);
  }
}
const ramp = () => signal(t => Math.floor(t*8+1e-8)/10);

test('captured file and decoded buffer survive live record edits while decode is pending', async () => {
  const gate=deferred(),h=harness({decode:() => gate.promise}),live=h.scene();
  const layer=live.layers[0],originalFile={name:'original.wav'},replacementBuffer=signal(() => 0.8);
  const originalRecord={file:originalFile,audioBuffer:undefined};
  h.FM.media.set(layer.id,originalRecord);
  const scene=detach(h.FM,live),media=captureRecords(h.FM,live);
  const pending=h.FM.exporter.buildAudioMix(scene,0,1,media);
  assert.deepEqual(h.decodedFiles,[originalFile]);
  originalRecord.file={name:'edited-record.wav'};originalRecord.audioBuffer=replacementBuffer;
  h.FM.media.set(layer.id,{file:{name:'replacement.wav'},audioBuffer:replacementBuffer});
  const originalBuffer=ramp();gate.resolve(originalBuffer);
  const mix=await pending;
  sampleAt(mix,0.125,0,'before captured start');
  sampleAt(mix,0.3125,0.1,'captured trim selects source block 2');
  sampleAt(mix,0.4375,0.15,'captured source PCM continues through block 3');
  sampleAt(mix,0.8125,0,'after captured duration');
  assert.equal(media.get(layer.id).file,originalFile);
  assert.equal(media.get(layer.id).audioBuffer,originalBuffer);
  assert.equal(originalRecord.audioBuffer,replacementBuffer,'decode must not overwrite the live record cache');
});

for(const captured of [true,false]) {
  test(`${captured?'explicit captured map':'default three-argument API'} determines records looked up after an earlier decode await`, async () => {
    const gate=deferred(),firstFile={name:'first.wav'},h=harness({decode:() => gate.promise});
    const live=h.scene({start:0,duration:0.25,trimStart:0,volume:1});
    const second=h.FM.makeLayer('video',{name:'Second',start:0.25,duration:0.25});
    second.trimStart=0;second.volume=0.5;live.layers.push(second);
    const oldSecond={file:{name:'old-second.wav'},audioBuffer:signal(() => 0.3)};
    h.FM.media.set(live.layers[0].id,{file:firstFile,audioBuffer:undefined});
    h.FM.media.set(second.id,oldSecond);
    const scene=detach(h.FM,live),media=captureRecords(h.FM,live);
    const pending=captured ? h.FM.exporter.buildAudioMix(scene,0,1,media)
      : h.FM.exporter.buildAudioMix(scene,0,1);
    oldSecond.file={name:'mutated.wav'};oldSecond.audioBuffer=signal(() => 0.9);
    h.FM.media.set(second.id,{file:{name:'new-second.wav'},audioBuffer:signal(() => 0.8)});
    gate.resolve(signal(() => 0.1));
    const mix=await pending;
    sampleAt(mix,0.125,0.1,'first decoded clip');
    sampleAt(mix,0.3125,captured?0.15:0.4,'second record uses the selected media source');
    sampleAt(mix,0.625,0,'both clips have ended');
    assert.equal(h.decodedFiles.length,1,'already decoded second buffer must be reused');
  });
}

for(const phase of ['decode','startRendering']) {
  test(`detached scene preserves volume, start and trim through live edits during ${phase}`, async () => {
    const gate=deferred(),entered=deferred();
    const h=harness(phase==='decode' ? {decode:() => { entered.resolve(); return gate.promise; }}
      : {beforeRender:() => { entered.resolve(); return gate.promise; }});
    const live=h.scene(),layer=live.layers[0],pcm=ramp();
    h.FM.media.set(layer.id,{file:{name:'original.wav',pcm},audioBuffer:phase==='decode'?undefined:pcm});
    const scene=detach(h.FM,live),media=captureRecords(h.FM,live);
    const pending=h.FM.exporter.buildAudioMix(scene,0,1,media);
    await entered.promise;
    layer.volume=0.25;layer.start=0;layer.trimStart=0.5;
    live.project.duration=0.1;
    gate.resolve(pcm);
    const mix=await pending;
    sampleAt(mix,0.0625,0,'captured start remains 0.25');
    sampleAt(mix,0.3125,0.1,'captured trim and gain remain 0.25 and 0.5');
    sampleAt(mix,0.4375,0.15,'captured source offset progresses normally');
    sampleAt(mix,0.8125,0,'captured duration remains 0.5');
    assert.equal(scene.layers[0].volume,0.5);
    assert.equal(scene.layers[0].start,0.25);
    assert.equal(scene.layers[0].trimStart,0.25);
    assert.equal(mix.audioBuffer.length,48000,'captured export range remains one second');
  });
}

test('live scene control demonstrates that late edits would change scheduled samples without detachment', async () => {
  const gate=deferred(),h=harness({decode:() => gate.promise}),live=h.scene(),layer=live.layers[0];
  h.FM.media.set(layer.id,{file:{name:'original.wav'},audioBuffer:undefined});
  const pending=h.FM.exporter.buildAudioMix(live,0,1);
  layer.volume=0.25;layer.start=0;layer.trimStart=0.5;
  gate.resolve(ramp());
  const mix=await pending;
  sampleAt(mix,0.0625,0.1,'late live trim/gain/start change output');
  sampleAt(mix,0.1875,0.125,'late live source progresses from new trim');
  sampleAt(mix,0.625,0,'late live clip has already ended');
});

test('all media lookup branches use the captured map while healthy audio still produces PCM', async () => {
  const h=harness(),live=h.scene({start:0,duration:0.5,trimStart:0,volume:0.5});
  const hidden=h.FM.makeLayer('video',{name:'Hidden captured audio',duration:0.5});hidden.visible=false;
  const unsupported=h.FM.makeLayer('shape',{name:'Unsupported captured audio',fill:'#f00'});
  live.layers.push(hidden,unsupported);
  for(const layer of live.layers)h.FM.media.set(layer.id,{file:{name:layer.name+'.wav'},audioBuffer:signal(() => 0.4)});
  const scene=detach(h.FM,live),media=captureRecords(h.FM,live);
  h.FM.media=new Map();
  const mix=await h.FM.exporter.buildAudioMix(scene,0,1,media);
  sampleAt(mix,0.125,0.2,'healthy captured audio remains present');
  assert.equal(h.FM._lastAudioSuppressed.length,1);
  assert.match(h.FM._lastAudioSuppressed[0],/Hidden captured audio.*hidden/);
  assert.equal(h.FM._lastAudioDrops.length,1);
  assert.match(h.FM._lastAudioDrops[0],/Unsupported captured audio.*shape/);
  assert(Math.abs(h.FM._lastMixPeak-0.2)<1e-6,'real mixer peak scan observes the modeled output');
});
