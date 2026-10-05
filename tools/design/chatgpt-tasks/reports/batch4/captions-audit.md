# Captions end-to-end review

**Main snapshot:** `28104a3e83e01ac3880db3fac604a7444c7235aa`  
**Method:** Source review only. I did not run the application or a device/browser test. The trigger below is inferred from the cited control flow.

## Finding

### Medium — an unreadable first candidate aborts automatic speech detection before later audio sources are tried

**Condition and user impact:** This occurs in the multi-source “The whole project” mode when the initially selected/default source has no decodable audio (for example, a silent video), while a later video/audio layer in the project does contain speech. The caption UI builds a queue of all eligible sources for this mode, but a decode failure throws out of the loop rather than moving to the next source. The user sees “Speech detection failed” and gets no cues from the later voice clip.

**Evidence:**

- `js/captions.js:522` — `const queue = (mode === 'source') ? [src] : [src].concat(sources.filter(l => l.id !== src.id));`
- `js/captions.js:531-533` — `r = await C.detect(layer, cand, p => { btn.textContent = 'Listening…' + tag + ' ' + Math.round(p * 100) + '%'; }, mode);\n            used = cand;\n            if (r.count) break;`
- `js/captions.js:282-284` — `const buf = await FM.decodeAudio(m.file, { rate: 8000 });\n      if (!buf) throw new Error('no decodable audio in that clip');\n      const res = await FM.detectSpeech(buf, { onProgress: onProgress });`
- `js/media.js:842-844` — `return await ctx.decodeAudioData(buf);\n    } catch (e) {\n      return null;   // no decodable audio track (screen recordings etc.)`
- `js/captions.js:570-573` — `} catch (err) {\n          btn.textContent = label; btn.disabled = false;\n          if (FM.reportError) FM.reportError('detecting speech for captions', err);   // queue 674: the raw message goes to Settings → Last error, not the screen\n          if (FM.toast) FM.toast('Speech detection failed \\u2014 the details are in Settings \\u2192 Last error \\u2192 Copy', 6000);`

**Steps to trigger:**

1. Add a silent video first, then add a clip containing speech.
2. Create/select a caption track, choose “The whole project,” and leave the initial source as the first clip.
3. Tap **Detect speech**.

**Expected from the multi-source queue structure:** a failed/no-audio candidate is skipped and the next candidate is tried. **Actual from the source flow:** `C.detect` throws on the first source’s null decode, leaving the loop for the outer catch, so the second source is never attempted.

**Confidence:** High for the source control flow; not runtime-confirmed.

## Coverage and execution

I read caption cue creation, normalization, speech detection and source-time mapping in `js/captions.js`; cue rendering in `js/scene.js` and `js/compositor.js`; and caption splitting in `js/app.js`. I did not execute UI or export tests. This report records the source issue above; UI and export runtime were not exercised.
