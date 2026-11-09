# Effect upgrades proposed by the #1243 FX1 truth audit (9 Nov 2026)

Each is an effect that could really do what a better picture would show. Size S/M/L. Blinds first.

## U1 [M]
Venetian Blinds: add a Look option (Holes, Solid slats). Solid paints each closed strip in a Slat colour with a shading gradient across it, so opening reads as slats tilting and a picture really shows between them. Default stays Holes so no saved project moves. The kernel only writes alpha today and skips alpha-0 pixels, so Solid needs an RGB write.
Where: js/compositor.js row 27659; PIXEL_FX.blinds 27671

## U2 [M]
Dispersion: add a Sweep (Off, From left, right, top, bottom) that biases the noise threshold by position, so a real front crosses the layer and leaves one side solid. Off stays as it is now.
Where: js/compositor.js row 2403; kernel 8546

## U3 [S]
Starfield: add Streak to Fly-through, drawing each star as a radial line whose length grows with speed, for real hyperspace.
Where: js/compositor.js row 824; starfieldMoving 7810

## U4 [S]
Lens Blur: raise the Radius cap from 30 px to about 120 and confirm Bloom produces visible discs on a night photo. Check the cost on a phone.
Where: js/compositor.js row 630; kernel near 10155

## U5 [S]
Directional Blur: raise the Distance cap from 60 px to about 400, which a real speed smear needs.
Where: js/compositor.js row 954; kernel 20666

## U6 [L]
Number Roll: add Style (Plain, Rolling digits), where each digit slides vertically like an odometer. Text effects only change the string today, so this needs a per-digit clip path.
Where: js/compositor.js row 1457; TEXT_FX.counter 3742

## U7 [M]
Oil Paint: raise Radius above 8 and add a directional brush mode following image gradients, for visible strokes.
Where: js/compositor.js row 25284; PIXEL_FX.oilpaint 25513

## U8 [S]
Lens Flare: add Ghost shape (Circle, Hexagon) and a Ghost colour strength.
Where: js/compositor.js row 1298; ghost table 11721

## U9 [S]
CRT: add a Power 0 to 1 control that collapses the picture to a line then a dot, so a TV switch-on can be keyframed.
Where: js/compositor.js row 514; kernel 9912

## U10 [M]
Card Flip: add Back: Another layer or image, so a flip can reveal something different.
Where: js/compositor.js row 1722; kernel 20385

## U11 [L]
Cube: allow a different layer or image per face. Lowest priority.
Where: js/compositor.js row 1700; kernel 20275

