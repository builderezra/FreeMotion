    /* CAR — rebuilt from a published pictogram (queue 961). His words, 26 Sep: *"The car shape needs to be improved."*
       Traced from Phosphor Icons `car-profile` (fill weight, MIT, https://phosphoricons.com), his pick __PICK__ of three
       (A Material Design Icons `car-side`, B this, C the AIGA transport sign), the way the people landed (#929). Converted
       by the plan's build.py; the drawing sits at its own 1.777:1 proportion centred in the unit box, so SHAPE_ASPECT.car
       stays [1, 1]. The tyre is part of the silhouette and the hub is the hole, so nothing closes up at the Add menu's 34px:
       hubs 3.06px across (were 2.19), 7.1px² open each (were 4.1). 35 points, was 84. Holes wind against the body. */
    S.car = [
      // body — nose, front wheel, sill, rear wheel, tail, rear slope, roof, windscreen, bonnet
      [
        [0.98,0.4699,1,0,0.0331],[0.98,0.6199,1,0,0.0331],[0.92,0.6799,1,-0.0331,0],[0.8562,0.6799],
        [0.8136,0.7449,1,-0.0205,0.0159],[0.74,0.7701,1,-0.0274,0],[0.6664,0.7449,1,-0.0205,-0.0159],[0.6238,0.6799],
        [0.3763,0.6799],[0.3336,0.7449,1,-0.0205,0.0159],[0.26,0.7701,1,-0.0274,0],[0.1864,0.7449,1,-0.0205,-0.0159],
        [0.1438,0.6799],[0.08,0.6799,1,-0.0331,0],[0.02,0.6199,1,0,-0.0331],[0.02,0.4399,1,0,-0.0059],
        [0.025,0.4232,1,0.0033,-0.0049],[0.1363,0.2566,1,0.0111,-0.0166],[0.1861,0.2299,1,0.02,0],
        [0.6076,0.2299,1,0.0159,-0.0001],[0.65,0.2475,1,0.0112,0.0113],[0.8124,0.4099],[0.92,0.4099,1,0.0331,0],
      ],
      // the side window (hole — winds opposite the body so nonzero fill leaves it open)
      [
        [0.1063,0.4099],[0.7276,0.4099],[0.6076,0.2899],[0.1861,0.2899],
      ],
      // rear hub (hole)
      [
        [0.32,0.6499,1,0,-0.0331],[0.26,0.5899,1,-0.0331,0],[0.2,0.6499,1,0,0.0331],[0.26,0.7099,1,0.0331,0],
      ],
      // front hub (hole)
      [
        [0.8,0.6499,1,0,-0.0331],[0.74,0.5899,1,-0.0331,0],[0.68,0.6499,1,0,0.0331],[0.74,0.7099,1,0.0331,0],
      ],
    ];
