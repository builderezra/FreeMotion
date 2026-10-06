#!/usr/bin/env python3
"""What each test leaves in memory (#1085, 7 Oct) — the driver's half of tests.js's ?fmmem=1 handshake.

Loaded by tests/_cdp.py ONLY when it is given --mem FILE (a measuring run). With ?fmmem=1 in the address the runner stops
after every test, sets window.__fmWantMem = {seq, i, name, ms, ok} in the app frame and waits for __fmMemDone === seq. This
module answers it, while the page is idle between two tests:

  1. two forced garbage collections (HeapProfiler.collectGarbage), so what is left is what something still HOLDS;
  2. the page's own counters (Performance.getMetrics: JS heap, DOM nodes, documents, frames, listeners) and
     Runtime.getHeapUsage (adds the ArrayBuffer backing stores, which live outside the JS heap);
  3. the footprint of every Chrome process in this run's tree — macOS phys_footprint (what Activity Monitor calls Memory:
     resident + compressed + swapped dirty memory, so a renderer being squeezed into swap does not look like it shrank);
     on Linux /proc/<pid>/status (VmRSS + VmSwap, and VmData — the data segment a sandboxed renderer's ulimit counts);
  4. what is alive in the APP FRAME's heap, by kind (Runtime.queryObjects): media elements and what they have loaded,
     canvases and their pixels, AudioContexts by state, Workers, ImageBitmaps, VideoFrames, Blobs, ArrayBuffers… — about
     half a second a test. FM_MEM_DEEP=0 turns it off.
     ⚠️ queryObjects only returns objects created in the SAME CONTEXT as the prototype's handle, and a handle made by
     evaluating `frame.contentWindow.X.prototype` in the top page belongs to the TOP page's context — every count came back
     0 that way (the first version of this file). So the prototype is evaluated IN the app frame's own context, found from
     Runtime.executionContextCreated (re-sent by Runtime.disable + enable).
  5. with FM_MEM_INFRA=N, every Nth test (and the first and last): Chrome's own memory-infra dump — the renderer's memory by
     allocator (media/frame_buffers, malloc, partition_alloc, blink_gc, v8, skia, cc, gpu…), ~2 s each.

One JSON line per handshake goes to FILE. Growth between two lines belongs to the test that ran between them.
"""

import base64, ctypes, json, os, subprocess, sys, time

IS_MAC = sys.platform == "darwin"


class _RusageV4(ctypes.Structure):
    _fields_ = [("ri_uuid", ctypes.c_uint8 * 16)] + [(n, ctypes.c_uint64) for n in (
        "ri_user_time", "ri_system_time", "ri_pkg_idle_wkups", "ri_interrupt_wkups", "ri_pageins", "ri_wired_size",
        "ri_resident_size", "ri_phys_footprint", "ri_proc_start_abstime", "ri_proc_exit_abstime", "ri_child_user_time",
        "ri_child_system_time", "ri_child_pkg_idle_wkups", "ri_child_interrupt_wkups", "ri_child_pageins",
        "ri_child_elapsed_abstime", "ri_diskio_bytesread", "ri_diskio_byteswritten", "ri_cpu_time_qos_default",
        "ri_cpu_time_qos_maintenance", "ri_cpu_time_qos_background", "ri_cpu_time_qos_utility", "ri_cpu_time_qos_legacy",
        "ri_cpu_time_qos_user_initiated", "ri_cpu_time_qos_user_interactive", "ri_billed_system_time",
        "ri_serviced_system_time", "ri_logical_writes", "ri_lifetime_max_phys_footprint", "ri_instructions", "ri_cycles",
        "ri_billed_energy", "ri_serviced_energy", "ri_interval_max_phys_footprint", "ri_runnable_time")]


_libproc = None


def _mac_mem(pid):
    global _libproc
    if _libproc is None:
        _libproc = ctypes.CDLL("/usr/lib/libproc.dylib")
    ri = _RusageV4()
    if _libproc.proc_pid_rusage(int(pid), 4, ctypes.byref(ri)) != 0:
        return None
    return {"fp": ri.ri_phys_footprint, "rss": ri.ri_resident_size, "peak": ri.ri_lifetime_max_phys_footprint}


def _linux_mem(pid):
    try:
        with open("/proc/%d/status" % pid) as f:
            kv = dict(l.split(":", 1) for l in f if ":" in l)
        kb = lambda k: int(kv.get(k, "0 kB").split()[0]) * 1024
        return {"fp": kb("VmRSS") + kb("VmSwap"), "rss": kb("VmRSS"), "peak": kb("VmHWM"), "data": kb("VmData")}
    except Exception:
        return None


def proc_mem(pid):
    return _mac_mem(pid) if IS_MAC else _linux_mem(pid)


def chrome_tree(root):
    """[(pid, kind)] for the browser process `root` and every descendant; kind is renderer / gpu / utility:<sub> / browser."""
    try:
        out = subprocess.run(["ps", "-Ao", "pid=,ppid=,command="], capture_output=True, text=True).stdout
    except Exception:
        return [(root, "browser")]
    kids, cmd = {}, {}
    for line in out.splitlines():
        p = line.strip().split(None, 2)
        if len(p) < 2 or not p[0].isdigit() or not p[1].isdigit():
            continue
        pid, ppid = int(p[0]), int(p[1])
        kids.setdefault(ppid, []).append(pid)
        cmd[pid] = p[2] if len(p) > 2 else ""
    res, todo = [], [root]
    while todo:
        pid = todo.pop()
        c = cmd.get(pid, "")
        if pid == root:
            kind = "browser"
        elif "--type=renderer" in c:
            kind = "renderer"
        elif "--type=gpu-process" in c:
            kind = "gpu"
        elif "--type=utility" in c:
            sub = c.split("--utility-sub-type=", 1)[1].split()[0] if "--utility-sub-type=" in c else "?"
            kind = "utility:" + sub.split(".")[-1]
        else:
            kind = "other"
        res.append((pid, kind))
        todo.extend(kids.get(pid, []))
    return res


def snapshot_procs(root):
    """{pid: {kind, fp, rss, peak}} for the whole tree."""
    snap = {}
    for pid, kind in chrome_tree(root):
        m = proc_mem(pid)
        if m:
            m["kind"] = kind
            snap[pid] = m
    return snap


# ── the app frame's own execution context (see the docstring, point 4) ──────────────────────────────────────────────────

def _send_collect(cdp, method, **params):
    """cdp.send that also returns the events which arrived before its answer (the CDP class drops them)."""
    cdp.n += 1
    my = cdp.n
    cdp.ws.send(json.dumps({"id": my, "method": method, "params": params}))
    events = []
    while True:
        msg = json.loads(cdp.ws.recv())
        if msg.get("id") == my:
            if "error" in msg:
                raise RuntimeError("%s: %s" % (method, msg["error"]))
            return msg.get("result", {}), events
        if msg.get("method") == "Inspector.targetCrashed":
            cdp.crashed = True
            raise RuntimeError("the page's renderer crashed")
        if "method" in msg:
            events.append(msg)


def app_context(cdp, state, fresh=False):
    if state.get("ctx") and not fresh:
        return state["ctx"]
    tree = cdp.send("Page.getFrameTree")["frameTree"]
    kids = tree.get("childFrames", [])
    app = next((c["frame"]["id"] for c in kids if "/index.html" in c["frame"].get("url", "")), None)
    if not app and kids:
        app = kids[0]["frame"]["id"]   # run.html has one frame, #app
    if not app:
        return None
    cdp.send("Runtime.disable")
    _, evs = _send_collect(cdp, "Runtime.enable")
    for e in evs:
        if e.get("method") != "Runtime.executionContextCreated":
            continue
        c = e["params"]["context"]
        aux = c.get("auxData") or {}
        if aux.get("frameId") == app and aux.get("isDefault"):
            state["ctx"] = c["id"]
            return c["id"]
    return None


# What queryObjects is asked for, by the prototype in the APP FRAME's realm. Each entry: (label, prototype expression, a
# function run on the found array that returns a summary). EventTarget first: one heap walk finds media elements, canvases,
# AudioContexts, Workers, OffscreenCanvases, MessagePorts, peer connections, codecs and every DOM node alike.
_DEEP = [
    ("et", "EventTarget.prototype", r"""function(){
      var by = {}, media = [], cv = { n: 0, detached: 0, px: 0, detachedPx: 0 }, ac = {}, img = { n: 0, px: 0, detached: 0, detachedPx: 0 }, ifr = 0;
      // WHO MADE IT (tests.js memInstall tags every canvas / media / image / iframe / AudioContext / Worker a test makes)
      var B = window.__fmMemBorn, who = {}, sizes = {};
      function add(o, kind, px) { var k; try { k = B && B.get(o); } catch (e) {} k = k || '(boot / untagged)'; var w = who[k] || (who[k] = {}); w[kind] = (w[kind] || 0) + 1; if (px) w[kind + 'Px'] = (w[kind + 'Px'] || 0) + px; }
      for (var i = 0; i < this.length; i++) {
        var o = this[i], n;
        // the walk also returns the PROTOTYPES themselves (HTMLVideoElement.prototype…), whose getters throw Illegal invocation
        try { if (o.constructor && o.constructor.prototype === o) continue; } catch (e) { continue; }
        try { n = o.constructor && o.constructor.name || '?'; } catch (e) { n = '?'; }
        if (n === 'HTMLImageElement') {
          var p = 0; try { p = (o.complete && o.naturalWidth * o.naturalHeight) || 0; } catch (e) {}
          img.n++; img.px += p; if (!o.isConnected) { img.detached++; img.detachedPx += p; } add(o, 'img', p);
          continue;
        }
        if (n === 'HTMLIFrameElement') { ifr++; add(o, 'iframe', 0); continue; }
        if (/^(Text|Comment|CDATASection|HTML(Div|Span|Button|Input|Label|Option|Select|Br|LI|Li|UList|Ul|Path|Style|Script|Link|Meta|Anchor|Paragraph|Heading|Unknown|TextArea|Template|Slot|Form|Table.*|Head|Body|Html|Title|Details|Summary|Dialog|Progress|Pre|Font|FieldSet|Fieldset|Legend|Output|Picture|Source|Track|HR|Hr|Mod|Quote|Time|Data|Menu|DList|OList|Area|Map|Base|Embed|Object|Param|Meter|DataList|OptGroup)Element|SVG.*Element|DocumentFragment|ShadowRoot|CSSStyleSheet|XMLDocument|HTMLDocument|Document|Attr)$/.test(n)) { by['(dom)'] = (by['(dom)'] || 0) + 1; continue; }
        by[n] = (by[n] || 0) + 1;
        if (n === 'HTMLVideoElement' || n === 'HTMLAudioElement') {
          var s = '', vw = 0, vh = 0, paused = 1, ns = 0;
          try { s = String(o.currentSrc || o.src || (o.srcObject ? '[srcObject]' : '')).slice(0, 60); } catch (e) {}
          try { vw = o.videoWidth || 0; vh = o.videoHeight || 0; paused = o.paused ? 1 : 0; ns = o.networkState; } catch (e) {}
          media.push([n === 'HTMLVideoElement' ? 'v' : 'a', o.isConnected ? 1 : 0, o.readyState, s, vw * vh, paused, ns]);
          add(o, o.readyState > 0 ? 'mediaLoaded' : 'media', o.readyState > 0 ? vw * vh : 0);
        } else if (n === 'HTMLCanvasElement') {
          var a = (o.width * o.height) || 0; cv.n++; cv.px += a; if (!o.isConnected) { cv.detached++; cv.detachedPx += a; } add(o, o.isConnected ? 'cv' : 'cvDet', a); if (!o.isConnected && a) { var sk = o.width + 'x' + o.height; sizes[sk] = (sizes[sk] || 0) + 1; }
        } else if (/AudioContext$/.test(n)) { var st = ''; try { st = o.state; } catch (e) {} ac[n + ':' + st] = (ac[n + ':' + st] || 0) + 1; add(o, n === 'OfflineAudioContext' ? 'oac' : 'ac:' + st, 0); }
        else if (n === 'Worker' || n === 'OffscreenCanvas' || n === 'VideoFrame') { add(o, n, 0); }
      }
      function norm(s) { return s.replace(/^blob:[^/]*\/\/[^/]*\//, 'blob:').replace(/[0-9a-f]{8}-[0-9a-f-]{27}/, '<uuid>').replace(/^https?:\/\/[^/]*\//, '/'); }
      var mediaSum = { n: media.length, video: 0, detached: 0, loaded: 0, detachedLoaded: 0, playing: 0, px: 0, srcs: {} };
      media.forEach(function (m) {
        if (m[0] === 'v') mediaSum.video++;
        if (!m[1]) mediaSum.detached++;
        if (m[2] > 0) { mediaSum.loaded++; mediaSum.px += m[4]; if (!m[1]) mediaSum.detachedLoaded++; }
        if (!m[5]) mediaSum.playing++;
        if (m[2] > 0) { var k = m[0] + (m[1] ? '+' : '-') + ':' + norm(m[3]); mediaSum.srcs[k] = (mediaSum.srcs[k] || 0) + 1; }
      });
      var keys = Object.keys(mediaSum.srcs).sort(function (x, y) { return mediaSum.srcs[y] - mediaSum.srcs[x]; }).slice(0, 8);
      var top = {}; keys.forEach(function (k) { top[k] = mediaSum.srcs[k]; }); mediaSum.srcs = top;
      var score = function (w) { return (w.cvPx || 0) + (w.cvDetPx || 0) + (w.mediaLoadedPx || 0) * 1.5 + (w.imgPx || 0) + 4e6 * ((w.mediaLoaded || 0) + (w['ac:running'] || 0) + (w['ac:suspended'] || 0) + (w.Worker || 0) + (w.iframe || 0)) + 1e4 * ((w.cvDet || 0) + (w.img || 0) + (w.media || 0)); };
      var wk = Object.keys(who).sort(function (x, y) { return score(who[y]) - score(who[x]); });
      var whoTop = {}; wk.slice(0, 25).forEach(function (k) { whoTop[k] = who[k]; });
      var szTop = {}; Object.keys(sizes).sort(function (x, y) { var px = function (k) { var p = k.split('x'); return p[0] * p[1] * sizes[k]; }; return px(y) - px(x); }).slice(0, 8).forEach(function (k) { szTop[k] = sizes[k]; });
      return { by: by, media: mediaSum, canvas: cv, ac: ac, img: img, iframes: ifr, who: whoTop, whoN: wk.length, detSizes: szTop };
    }"""),
    ("ab", "ArrayBuffer.prototype", "function(){var n=this.length,b=0,big=0,bigB=0;for(var i=0;i<n;i++){var x=0;try{x=this[i].byteLength}catch(e){};b+=x;if(x>=1048576){big++;bigB+=x;}}return {n:n,bytes:b,big:big,bigBytes:bigB};}"),
    ("bmp", "ImageBitmap.prototype", "function(){var B=window.__fmMemBorn,who={},n=this.length,p=0,open=0;for(var i=0;i<n;i++){try{var a=this[i].width*this[i].height;p+=a;if(a){open++;var k=(B&&B.get(this[i]))||'(untagged)';who[k]=(who[k]||0)+a;}}catch(e){}}var t={};Object.keys(who).sort(function(x,y){return who[y]-who[x]}).slice(0,10).forEach(function(k){t[k]=who[k]});return {n:n,open:open,px:p,who:t};}"),
    ("blob", "Blob.prototype", "function(){var n=this.length,b=0;for(var i=0;i<n;i++){try{b+=this[i].size}catch(e){}}return {n:n,bytes:b};}"),
    ("abuf", "AudioBuffer.prototype", "function(){var n=this.length,s=0;for(var i=0;i<n;i++){try{s+=this[i].length*this[i].numberOfChannels}catch(e){}}return {n:n,samples:s,bytes:s*4};}"),
    ("idata", "ImageData.prototype", "function(){var n=this.length,p=0;for(var i=0;i<n;i++){try{p+=this[i].width*this[i].height}catch(e){}}return {n:n,px:p};}"),
    ("vf", "(self.VideoFrame||function(){}).prototype", "function(){var n=this.length,open=0,p=0;for(var i=0;i<n;i++){try{if(this[i].format){open++;p+=this[i].codedWidth*this[i].codedHeight}}catch(e){}}return {n:n,open:open,px:p};}"),
    ("ocv", "OffscreenCanvas.prototype", "function(){var n=this.length,p=0;for(var i=0;i<n;i++){try{p+=this[i].width*this[i].height}catch(e){}}return {n:n,px:p};}"),
    ("gl", "WebGLRenderingContext.prototype", "function(){var n=this.length,lost=0,px=0;for(var i=0;i<n;i++){try{if(this[i].isContextLost())lost++;else px+=this[i].drawingBufferWidth*this[i].drawingBufferHeight}catch(e){}}return {n:n,lost:lost,px:px};}"),
    ("gl2", "WebGL2RenderingContext.prototype", "function(){var n=this.length,lost=0,px=0;for(var i=0;i<n;i++){try{if(this[i].isContextLost())lost++;else px+=this[i].drawingBufferWidth*this[i].drawingBufferHeight}catch(e){}}return {n:n,lost:lost,px:px};}"),
    ("win", "Window.prototype", "function(){return {n:this.length};}"),
]


def deep_counts(cdp, state, only=None):
    """What is alive in the app frame's heap, by kind (queryObjects). Each entry costs one heap walk (~50 ms)."""
    out = {}
    ctx = app_context(cdp, state)
    if not ctx:
        return {"err": "no app context"}
    for label, proto, fn in _DEEP:
        if only and label not in only:
            continue
        for attempt in (0, 1):
            try:
                r = cdp.send("Runtime.evaluate", expression="(function(){try{return %s}catch(e){return null}})()" % proto,
                             objectGroup="fmmem", contextId=ctx)
                oid = r.get("result", {}).get("objectId")
                if not oid:
                    break
                q = cdp.send("Runtime.queryObjects", prototypeObjectId=oid, objectGroup="fmmem")
                arr = q.get("objects", {}).get("objectId")
                v = cdp.send("Runtime.callFunctionOn", objectId=arr, functionDeclaration=fn, returnByValue=True)
                out[label] = v.get("result", {}).get("value")
                break
            except Exception as e:
                if attempt == 0 and "context" in str(e).lower():
                    ctx = app_context(cdp, state, fresh=True)   # the context id went stale: find it again, once
                    continue
                out[label] = {"err": str(e)[:160]}
                break
            finally:
                try:
                    cdp.send("Runtime.releaseObjectGroup", objectGroup="fmmem")
                except Exception:
                    pass
    return out


# ── Chrome's memory-infra dump (docstring point 5) ──────────────────────────────────────────────────────────────────────

_INFRA_KEYS = ("malloc", "partition_alloc", "blink_gc", "v8", "media", "media/frame_buffers", "media/webmediaplayer",
               "skia", "cc", "gpu", "discardable", "shared_memory", "web_cache", "font_caches", "blink_objects", "canvas",
               "gpu/shared_images", "gpu/gl", "partition_alloc/partitions/array_buffer", "partition_alloc/partitions/buffer",
               "partition_alloc/partitions/fast_malloc", "partition_alloc/partitions/layout", "v8/main", "v8/workers",
               "v8/main/heap", "v8/main/global_handles", "audio", "webaudio", "web_audio", "mojo", "site_storage", "leveldatabase",
               "indexeddb", "sqlite", "media/video_frame_pool", "media/audio", "site_storage", "site_storage/blob_storage",
               "site_storage/indexed_db", "devtools", "devtools/sessions", "mojo/queued_ipc_channel_message", "canvas/ResourceProvider",
               "blink_objects/Document", "blink_objects/Node", "blink_objects/JSEventListener", "blink_objects/Frame",
               "blink_objects/RTCPeerConnection", "blink_objects/AudioHandler", "parkable_images", "web_cache/Image_resources",
               "cc/tile_memory", "cc/resource_memory", "frame_evictor", "iosurface")


def infra_dump(cdp):
    """{pid: {"name", "pf": private_footprint, allocator: bytes…}} from one memory-infra dump, or {"err": …}."""
    try:
        cdp.send("Tracing.start", traceConfig={"includedCategories": ["disabled-by-default-memory-infra"], "excludedCategories": ["*"],
                                               "memoryDumpConfig": {"triggers": []}}, transferMode="ReturnAsStream")
        cdp.send("Tracing.requestMemoryDump", deterministic=True, levelOfDetail="detailed")
        _, evs = _send_collect(cdp, "Tracing.end")
        done = [e for e in evs if e.get("method") == "Tracing.tracingComplete"]
        t0 = time.time()
        while not done and time.time() - t0 < 60:
            msg = json.loads(cdp.ws.recv())
            if msg.get("method") == "Tracing.tracingComplete":
                done = [msg]
        if not done:
            return {"err": "no tracingComplete"}
        h = done[0]["params"]["stream"]
        buf = []
        while True:
            rr = cdp.send("IO.read", handle=h, size=1 << 20)
            d = rr.get("data", "")
            if rr.get("base64Encoded"):
                d = base64.b64decode(d).decode("utf-8", "replace")
            buf.append(d)
            if rr.get("eof"):
                break
        cdp.send("IO.close", handle=h)
        data = json.loads("".join(buf))
        events = data["traceEvents"] if isinstance(data, dict) else data
    except Exception as e:
        return {"err": str(e)[:200]}
    names, out = {}, {}
    for e in events:
        if e.get("ph") == "M" and e.get("name") == "process_name":
            names[e["pid"]] = e["args"].get("name")
    for e in events:
        if e.get("ph") != "v":
            continue
        pid = e["pid"]
        dumps = e.get("args", {}).get("dumps", {})
        rec = out.setdefault(str(pid), {"name": names.get(pid)})
        pt = dumps.get("process_totals", {})
        if "private_footprint_bytes" in pt:
            v = pt["private_footprint_bytes"]
            rec["pf"] = int(v, 16) if isinstance(v, str) else v
        extra = tuple(x for x in os.environ.get("FM_MEM_INFRA_ALL", "").split(",") if x)   # e.g. "cc,media": every key under them
        for k, v in dumps.get("allocators", {}).items():
            if extra and k.startswith(extra) and k.count("/") <= 3:
                sz = v.get("attrs", {}).get("size", {}).get("value")
                if sz is not None and int(sz, 16) >= 1 << 20:
                    rec[k] = int(sz, 16)
                continue
            # one compositor per frame tree (cc/tile_manager_<id>): how many there are, and the biggest, says whether tile
            # memory is one budget filling up or a new compositor per test
            if k.startswith("cc/tile_manager_") and k.count("/") == 1:
                sz = v.get("attrs", {}).get("size", {}).get("value")
                if sz is not None:
                    rec["cc/tile_managers"] = rec.get("cc/tile_managers", 0) + 1
                    rec["cc/tile_manager_max"] = max(rec.get("cc/tile_manager_max", 0), int(sz, 16))
                continue
            if k not in _INFRA_KEYS and not (k.startswith("media/webmediaplayer/") and k.count("/") == 2):
                continue
            sz = v.get("attrs", {}).get("size", {}).get("value")
            if sz is None:
                continue
            rec[k] = int(sz, 16)
    return out


def _sum(snap, kind=None):
    return sum(v["fp"] for v in snap.values() if kind is None or v["kind"] == kind)


def _max(snap, kind):
    return max([v["fp"] for v in snap.values() if v["kind"] == kind] or [0])


def measure(cdp, root_pid, want, state, deep=True, deep_only=None, infra=False):
    t0 = time.time()
    pre = snapshot_procs(root_pid)
    gc_err = ""
    try:
        cdp.send("HeapProfiler.collectGarbage")
        cdp.send("HeapProfiler.collectGarbage")
    except Exception as e:
        gc_err = str(e)[:200]
    t_gc = time.time()
    metrics, hu = {}, {}
    try:
        cdp.send("Performance.enable")
        metrics = {m["name"]: m["value"] for m in cdp.send("Performance.getMetrics").get("metrics", [])}
        hu = cdp.send("Runtime.getHeapUsage")
    except Exception:
        pass
    post = snapshot_procs(root_pid)
    rec = {
        "seq": want.get("seq"), "i": want.get("i"), "gi": want.get("gi"), "name": want.get("name"), "tms": want.get("ms"), "ok": want.get("ok"),
        "t": round(t0, 2),
        "heapUsed": metrics.get("JSHeapUsedSize"), "heapTotal": metrics.get("JSHeapTotalSize"),
        "backing": hu.get("backingStorageSize"), "embedder": hu.get("embedderHeapUsedSize"),
        "nodes": metrics.get("Nodes"), "docs": metrics.get("Documents"), "frames": metrics.get("Frames"),
        "listeners": metrics.get("JSEventListeners"), "layoutObjects": metrics.get("LayoutObjects"),
        "rendPre": _sum(pre, "renderer"), "rendPost": _sum(post, "renderer"), "rendMax": _max(post, "renderer"),
        "gpuPost": _sum(post, "gpu"), "allPre": _sum(pre), "allPost": _sum(post),
        "procs": {str(k): [v["kind"], v["fp"], v.get("peak", 0), v.get("data", 0)] for k, v in post.items()},
        "gcMs": round((t_gc - t0) * 1000), "gcErr": gc_err,
    }
    try:
        info = cdp.eval("(function(){var f=document.getElementById('app');var w=f&&f.contentWindow;return JSON.stringify(w&&w.__fmMemInfo||null)})()")
        rec["page"] = json.loads(info or "null")
    except Exception:
        pass
    if deep:
        rec["deep"] = deep_counts(cdp, state, deep_only)
    if infra:
        rec["infra"] = infra_dump(cdp)
    rec["ms"] = round((time.time() - t0) * 1000)
    return rec


def service(cdp, root_pid, fh, state):
    """Called from _cdp.py's poll loop: answer a pending handshake, if any. Returns True when it answered one."""
    try:
        raw = cdp.eval("(function(){var f=document.getElementById('app');var w=f&&f.contentWindow;var q=w&&w.__fmWantMem;"
                       "if(!q||typeof q.seq!=='number'||w.__fmMemDone===q.seq) return null;return JSON.stringify(q);})()")
    except Exception:
        return False
    if not raw:
        return False
    want = json.loads(raw)
    if not state.get("names"):
        try:
            names = json.loads(cdp.eval("(function(){var f=document.getElementById('app');var w=f&&f.contentWindow;"
                                        "return JSON.stringify(w&&w.__fmMemNames||null)})()") or "null")
            if names:
                fh.write(json.dumps({"names": names, "root": root_pid, "range": want.get("range")}) + "\n")
                state["names"] = True
                state["last_i"] = want.get("last", len(names) - 1)
        except Exception:
            pass
    deep = os.environ.get("FM_MEM_DEEP", "1") != "0"
    only = [x for x in os.environ.get("FM_MEM_DEEP_ONLY", "").split(",") if x] or None
    every = int(os.environ.get("FM_MEM_INFRA", "0") or 0)
    i = want.get("i")
    infra = bool(every) and isinstance(i, int) and (i < 0 or i == state.get("last_i") or (i % every == every - 1))
    rec = measure(cdp, root_pid, want, state, deep=deep, deep_only=only, infra=infra)
    # every 25th test and the slice's last: the object URLs still alive, by the test that made them
    if isinstance(i, int) and (i == state.get("last_i") or (i >= 0 and i % 25 == 24)):
        try:
            rec["urlsBy"] = json.loads(cdp.eval("(function(){var f=document.getElementById('app');var w=f&&f.contentWindow;"
                                                "return JSON.stringify(w&&w.__fmMemUrls&&w.__fmMemUrls()||null)})()") or "null")
        except Exception:
            pass
    fh.write(json.dumps(rec) + "\n")
    fh.flush()
    try:
        cdp.eval("(function(){var f=document.getElementById('app');var w=f&&f.contentWindow;if(w)w.__fmMemDone=%d;})()" % int(want["seq"]))
    except Exception:
        pass
    return True
