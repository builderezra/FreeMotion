    /* CAR — rebuilt from a published pictogram (queue 961). His words, 26 Sep: *"The car shape needs to be improved."*
       The v5.33 car was drawn from named landmarks with its tyres as separate rings sitting in arches, and its own comment
       recorded the flaw: the tyre-to-arch gap was 0.023 of the box, 0.59px at the Add menu's 34px icon, so the ring ran
       into the body and the wheels read as dots. Done the way the people finally landed (#929): traced from a real
       pictogram rather than drawn — Pictogrammers Material Design Icons `car-side` (Apache-2.0,
       https://pictogrammers.com/library/mdi/icon/car-side/), his pick __PICK__ of three on the options sheet (A this, B
       Phosphor `car-profile`, C the AIGA transport sign). Converted by the plan's build.py: every arc is split into equal
       pieces so a smooth point's handle is the same both sides (FM.pointCtrl handles are symmetric), a kink stays a corner,
       and the drawing sits at its own 1.833:1 proportion centred in the unit box — so SHAPE_ASPECT.car stays [1, 1] and
       every Car already in a saved project keeps round wheels.
       Like every published car pictogram the tyre is PART of the silhouette, a round bump below the body, and the hub is
       the hole: nothing can close up at icon size. Measured through FM.renderScene at 1x in the icon's 25.5px box: hubs
       3.34px across (were 2.19), 7.9px² open each (were 4.1), wheels 4px below the body (were 2). 40 points, was 84.
       The body winds clockwise and every hole anticlockwise, so nonzero fill leaves the windows and hubs open. */
    S.car = [
      // body — roof, windscreen, bonnet, nose, front wheel, sill, rear wheel, tail, rear screen (the tyres are the bumps)
      [
        [0.6745,0.2382],[0.8055,0.4127],[0.8927,0.4127,1,0.0484,0],[0.98,0.5,1,0,0.0484],[0.98,0.6309],[0.8927,0.6309],
        [0.8824,0.6819,1,-0.0066,0.0157],[0.8544,0.7235,1,-0.0178,0.0178],[0.7618,0.7618,1,-0.0361,0],
        [0.6693,0.7235,1,-0.0178,-0.0178],[0.6412,0.6819,1,-0.0066,-0.0157],[0.6309,0.6309],[0.3691,0.6309],
        [0.3588,0.6819,1,-0.0066,0.0157],[0.3307,0.7235,1,-0.0178,0.0178],[0.2382,0.7618,1,-0.0361,0],
        [0.1456,0.7235,1,-0.0178,-0.0178],[0.1176,0.6819,1,-0.0066,-0.0157],[0.1073,0.6309],[0.02,0.6309],
        [0.02,0.5,1,0,-0.0242],[0.0455,0.4382,1,0.0158,-0.0158],[0.1073,0.4127],[0.2382,0.2382],
      ],
      // rear side window (hole — winds opposite the body so nonzero fill leaves it open)
      [
        [0.4345,0.3036],[0.2709,0.3036],[0.1884,0.4127],[0.4345,0.4127],
      ],
      // front side window (hole)
      [
        [0.5,0.3036],[0.5,0.4127],[0.7243,0.4127],[0.6418,0.3036],
      ],
      // rear hub (hole)
      [
        [0.2382,0.5655,1,-0.0361,0],[0.1727,0.6309,1,0,0.0361],[0.2382,0.6964,1,0.0361,0],[0.3036,0.6309,1,0,-0.0361],
      ],
      // front hub (hole)
      [
        [0.7618,0.5655,1,-0.0361,0],[0.6964,0.6309,1,0,0.0361],[0.7618,0.6964,1,0.0361,0],[0.8273,0.6309,1,0,-0.0361],
      ],
    ];
