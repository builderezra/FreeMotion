    /* CAR — rebuilt from a published pictogram (queue 961). His words, 26 Sep: *"The car shape needs to be improved."*
       The AIGA / US DOT transport sign's car (Car Rental and Taxi, 1974, public domain) — the same family as the people he
       picked in #929 ("Do the airport sign") — his pick __PICK__ of three (A Material Design Icons `car-side`, B Phosphor
       `car-profile`, C this). A FRONT view: windscreen and two headlights are the holes, the wheels are the two feet below
       the bumper. Converted by the plan's build.py; it sits at its own 1.207:1 proportion centred in the unit box, so
       SHAPE_ASPECT.car stays [1, 1]. At the Add menu's 34px the headlights are 3.42px across, 9.0px² open each. */
    S.car = [
      // body — roof, windscreen pillar, wing, bumper, right foot, under-bumper, left foot, wing, pillar
      [
        [0.4997,0.1024],[0.5929,0.1025],[0.7068,0.1042,1,0.043,-0.0015],[0.8096,0.1666,1,0.0229,0.05],[0.8923,0.3732],
        [0.9582,0.4141,1,0.0142,0.0175],[0.98,0.4694,1,0.0007,0.0179],[0.98,0.7401],[0.9007,0.7401],
        [0.9007,0.8312,1,0.0038,0.0868],[0.7591,0.8304,1,-0.0032,-0.0911],[0.7574,0.741],[0.2427,0.741],
        [0.241,0.8305,1,-0.0032,0.0911],[0.0993,0.8313,1,0.0038,-0.0868],[0.0993,0.7401],[0.02,0.7401],
        [0.02,0.4694,1,0.0007,-0.0179],[0.0418,0.4141,1,0.0142,-0.0175],[0.1077,0.3733],[0.1904,0.1666,1,0.0229,-0.05],
        [0.2933,0.1042,1,0.043,0.0015],[0.4072,0.1025],
      ],
      // windscreen (hole — winds opposite the body so nonzero fill leaves it open)
      [
        [0.3028,0.176],[0.2702,0.1829,1,-0.009,0.0054],[0.2496,0.2132,1,-0.0046,0.0156],[0.1908,0.3691],[0.81,0.3699],
        [0.7505,0.2096,1,-0.0145,-0.0323],[0.6873,0.1774,1,-0.0342,0.0008],[0.314,0.1762,1,-0.0038,-0.0002],
      ],
      // left headlight (hole)
      [
        [0.1057,0.5171,1,0,0.037],[0.1727,0.5842,1,0.037,0],[0.2398,0.5171,1,0,-0.037],[0.1727,0.4501,1,-0.037,0],
      ],
      // right headlight (hole)
      [
        [0.764,0.5171,1,0,0.037],[0.831,0.5842,1,0.037,0],[0.8981,0.5171,1,0,-0.037],[0.831,0.4501,1,-0.037,0],
      ],
    ];
