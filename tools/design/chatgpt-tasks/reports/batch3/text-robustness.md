# Text, Unicode and filename robustness review

Snapshot: `28104a3e83e01ac3880db3fac604a7444c7235aa`

Reviewed project import and text layout/export naming for emoji, RTL/non-Latin text, long strings, newlines and unusual filename characters. This was a source-only review; no browser/device execution was performed. Previously recorded text findings were skipped.

## Findings

### 1. Imported, unbroken text has no visible length limit and can trigger expensive wrapping work

**Severity:** Medium (potential import/render stall)  
**Confidence:** Medium; code path is confirmed, but no timing or crash was measured. **UNVERIFIED** as a user-visible stall.

**Evidence:** Imported layers are passed through sanitizers at `js/storage.js:1638-1649`, which validate masks, effects, timing and keyframes but do not bound or normalize a text layer's `text` string:

> function sanitizeImportedLayers(layers) {  
> (layers || []).forEach(l => {  
> ...  
> sanitizeKeyframes(l, 0);  
> });

For wrapped text, `js/compositor.js:18586-18593` repeatedly trims and slices the remaining string:

> while (trim(s).length > 1 && !fits(trim(s))) {  
> const solid = trim(s);  
> ...  
> out.push(solid.slice(0, cut));  
> s = solid.slice(cut) + s.slice(solid.length);

**Trigger:** Import a project containing a text layer with a very long single unbroken string and a positive, narrow wrapWidth. The first render/measurement asks the canvas to wrap it.

**Risk/cost:** No layer-text length cap is applied at this import boundary. The wrapping loop repeatedly creates a shorter suffix while measuring candidate prefixes. For a very large unbroken string, this can cause substantial allocation and main-thread work before the layer renders. The actual size at which a target phone stalls or is killed is device-dependent and was not measured.

### 2. Project-file download names discard legitimate non-ASCII project names

**Severity:** Low  
**Confidence:** High (the replacement is explicit in the naming code; browser-specific final download presentation was not executed)

**Evidence:** `js/storage.js:1794-1798` sanitizes the project title with an ASCII-oriented `\w` character class before assigning the download name:

> const name = (((obj.project && obj.project.name) || 'project').replace(/[^\w\- ]+/g, ' ').replace(/\s+/g, ' ').trim()) || 'project';  
> ...  
> a.download = name + '.fmotion.json';

The same rule is used for template-pack export at `js/storage.js:3127-3130`:

> const safe = String(project.name).replace(/[^\w\- ]+/g, ' ').replace(/\s+/g, ' ').trim() || 'template';

**Trigger:** Name a project with only non-ASCII letters or emoji (for example, Arabic text or a Japanese title), then export its project file or template pack.

**Impact:** The JSON retains the project name, but the downloaded file name loses those characters and falls back to a generic name such as `project.fmotion.json` or `template.fmotion.json`. This does not corrupt the project contents.

## Reviewed without a confirmed additional finding

- Text import stores strings as JavaScript strings, and the wrapping path splits paragraphs on LF (`js/compositor.js:18551-18555`). I did not confirm a newline-specific failure.
- RTL text has no explicit direction assignment at the text draw sites (`js/compositor.js:16912-16925`), but Canvas' inherited direction and browser bidi shaping affect the result; without a browser reproduction I am not calling this a defect.
- Emoji segmentation problems in animated/curved text and long project-name display issues were found in the audit/request search, so they are excluded rather than repeated here.

## Focused confirmation steps

1. Import a project with one 200,000-character unbroken text string and wrapWidth 300 on a phone; record import completion, time to first render, and whether the page remains responsive. Keep an ordinary 20-character wrapped-text project as the control.
2. Export a project named only in a non-Latin script and verify the saved filename on PC and iPhone; check that the JSON's internal project name remains intact.
