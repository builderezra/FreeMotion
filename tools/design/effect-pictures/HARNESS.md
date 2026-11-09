# truth.html: our picture beside the real effect
Open http://localhost:8791/truth.html, then `await __truthReady`. It runs the real renderer from /app/js; no service worker, nothing writes to the repo. To look, Read shots/<name>.png.

`await __truth(ids, ts, name, opts)`: ids is 'blinds,duotone' or an array (empty = all 60); ts defaults to [0.6,1.4,2.4]. Returns {saved, errors, rows:[{id,type,on,change}]}.
- Each row: at each t, OURS then REAL, 180 px each. Real = the effect's default params on a 1080 square project, so pixel-sized params mean what they mean in a real comp.
- opts: photo (key, or {id:key}; 'blank' = blank layer), back (second photo, same forms), params ({id:{key:value}}), project (default 1080), px (render size, default 360), span (seconds a progress sweep takes).
- errors names render failures, unknown params, and any effect that changed nothing against the plain layer. change = mean difference from the plain layer at each t (0..255).
- Subjects: the photo fx-thumbs.js maps, else a section default. Text on a text layer; generators (bolts, particles, weather, starfield, lens flare, visualiser) on a blank rectangle; wipes, opacity and luma key over a second photo; chroma key on the app's green-screen card; Time Echo gets an Orbit under it.
- Wipes, blinds, dissolve, dispersion and number roll have a static Progress/Amount by default, so sheets sweep it 0 to 1 across ts.

`await __real(type, params, photoKey, t, px)`: one frame; params merge over the defaults; window.__lastReal is the canvas. Progress is NOT swept here, so pass it.
`await __realShot(type, paramsList, photoKey, ts, name)`: one row per param set ({} = defaults), one cell per t. Progress sweeps unless the set names it. {_text:'...'} changes the words on a text layer.
Param keys: `FM.fxRegistry.makeInstance('blinds').params`. Tiles bolts and cube are effect types lightning and cube3d (__real and __realShot take either).
Many effects do not move at their defaults (duotone, vignette, shockwave, twirl): if a tile animates there, the animation is ours, not the effect's.
