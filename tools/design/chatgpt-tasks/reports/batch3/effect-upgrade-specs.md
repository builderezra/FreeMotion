# Six effect-upgrade specifications

Snapshot: `28104a3e83e01ac3880db3fac604a7444c7235aa`  
Branch: `chatgpt/effect-upgrade-specs`  
Scope: design specs only. I read the effect declarations and relevant render paths; I did not execute or change the renderer.

## 1. Pixelate — Keep outline

**Visual behavior.** Preserve the source layer's original alpha silhouette while its interior is pixelated, so rounded/diagonal edges stay clean instead of stepping with the blocks. At 0%, the existing pixelated alpha is used unchanged.

| Key | Label | Min | Max | Default | Unit |
|---|---|---:|---:|---:|---|
| `outline` | Keep outline | 0 | 100 | 0 | % |

**Existing behavior and compatibility.** The current catalog says `"{ key: 'size', label: 'Block size'… }"`, `"{ key: 'aspect', label: 'Block aspect'… }"`, and `"{ key: 'smooth', label: 'Edges'… }` ([js/compositor.js:87-91](../../js/compositor.js#L87)). The current render path says `"if (size <= 1) { ctx.drawImage(_pxA, OX, OY, W, H); … return; }"` and otherwise downsamples then upscales the plate ([js/compositor.js:14518-14550](../../js/compositor.js#L14518)). With `outline` defaulting to 0, all old projects (whose missing key resolves to the default) and new projects remain on the existing path and retain the same sampling, canvas calls, and compositing values. Thus defaults are specified to be byte-identical.

## 2. Mosaic — Tile bevel

**Visual behavior.** Add a restrained light rim on the top/left of each tile and a shadow on its bottom/right, making the cells read as raised or inset tiles. Higher depth makes the edge relief more visible; a separate direction control rotates the virtual light.

| Key | Label | Min | Max | Default | Unit |
|---|---|---:|---:|---:|---|
| `bevel` | Tile bevel | 0 | 100 | 0 | % |
| `lightAngle` | Light angle | 0 | 360 | 45 | ° |

**Existing behavior and compatibility.** The catalog quote is `"{ type: 'mosaic', label: 'Mosaic', params: ["` followed by controls `size`, `aspect`, `gap`, and `sample` ([js/compositor.js:362-367](../../js/compositor.js#L362)). Its kernel explicitly says `"var moIn=moGap===0?0:…"` and writes the selected cell colour; zero gap leaves no inset margin ([js/compositor.js:6540-6552](../../js/compositor.js#L6540)). A zero bevel is defined as the exact existing output; `lightAngle` is ignored at zero bevel. Every project with omitted new keys therefore follows the old kernel output, and explicit defaults do too: byte-identical.

## 3. Dots — Offset rows and ovals

**Visual behavior.** Stagger alternate rows horizontally for a printed halftone screen, and vary each dot's vertical diameter to form wide or tall ovals. Circular dots and an unstaggered lattice remain available at the defaults.

| Key | Label | Min | Max | Default | Unit |
|---|---|---:|---:|---:|---|
| `rowOffset` | Offset alternate rows | 0 | 100 | 0 | % of spacing |
| `oval` | Oval height | 25 | 400 | 100 | % of dot width |

**Existing behavior and compatibility.** The catalog quote is `"{ type: 'dots', label: 'Dots'"` ([js/compositor.js:374-379](../../js/compositor.js#L374)). Its kernel uses `"var dt_q=dt_dcx*dt_dcx+dt_dcy*dt_dcy"` with each centre derived from `Math.floor(dt_x/dt_sz)` and `Math.floor(dt_y/dt_sz)` ([js/compositor.js:6620-6631](../../js/compositor.js#L6620)). `rowOffset: 0` retains the existing x-centres, and `oval: 100` makes the vertical and horizontal radii equal, preserving the current circle-distance calculation. Those identity cases must use the same arithmetic as today; no new transform or resampling is applied at the defaults. Existing and new default instances are therefore byte-identical.

## 4. Grid — Bold lines

**Visual behavior.** Emphasize every Nth vertical and horizontal grid line, creating major/minor divisions while keeping the same grid spacing and angle. Increase the major-line weight to make the hierarchy stronger.

| Key | Label | Min | Max | Default | Unit |
|---|---|---:|---:|---:|---|
| `majorEvery` | Major line interval | 2 | 16 | 4 | lines |
| `majorWeight` | Major line weight | 100 | 400 | 100 | % of current weight |

**Existing behavior and compatibility.** The existing declaration is `"{ type: 'grid', label: 'Grid'"` and gives `size`, `thickness`, `mix`, and `angle` ([js/compositor.js:355-360](../../js/compositor.js#L355)). The default multiplier of 100% is exactly 1×, so even if a line is selected as a major line its weight stays unchanged. That must leave the existing line mask and colour blend untouched; all prior saved instances and newly added instances render byte-identically at defaults.

## 5. Contour Lines — Bold lines

**Visual behavior.** Make every Nth luminance contour a major contour with a wider stroke. This adds readable hierarchy to topographic maps without changing the number or location of contour boundaries.

| Key | Label | Min | Max | Default | Unit |
|---|---|---:|---:|---:|---|
| `majorEvery` | Major contour interval | 2 | 12 | 4 | contour levels |
| `majorWeight` | Major line weight | 100 | 400 | 100 | % of current weight |

**Existing behavior and compatibility.** The existing declaration quote is `"{ type: 'contourlines', label: 'Contour Lines'"` with `levels`, `smooth`, `thickness`, and `paper` ([js/compositor.js:524-529](../../js/compositor.js#L524)). Its kernel says `"if(clTh>1){…}"` around the mask dilation path after deriving luminance bands ([js/compositor.js:7054-7075](../../js/compositor.js#L7054)). A 100% major-weight multiplier cannot add pixels beyond that existing mask; default settings must retain the exact same mask and blend result. Existing and new projects are byte-identical at defaults.

## 6. Posterize — Band offset

**Visual behavior.** Shift the quantization thresholds within each channel's range, moving the band boundaries without changing the number of levels. Positive and negative offsets bias where tones snap; 0% preserves the current evenly spaced bands.

| Key | Label | Min | Max | Default | Unit |
|---|---|---:|---:|---:|---|
| `offset` | Band offset | -50 | 50 | 0 | % of one band step |

**Existing behavior and compatibility.** The existing declaration quote is `"{ type: 'posterize', label: 'Posterize'"` with `levels`, `mix`, `channels`, and `gamma` ([js/compositor.js:92-97](../../js/compositor.js#L92)). Its kernel says `"if (mix === 1 && ch === 0 && gm === 1) {"` before retaining the original quantization loop ([js/compositor.js:14326-14340](../../js/compositor.js#L14326)). At `offset: 0`, the new control must not perturb that loop or its inputs; it is defined as an identity case. Every existing project and a new default instance therefore remain byte-identical.
