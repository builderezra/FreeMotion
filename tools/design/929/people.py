"""#929 — the people options, each modelled on a NAMED reference, emitted in FreeMotion's point format.
Run: python3 people.py  -> prints JSON {id: {person, woman}} (consumed by build.py).

Sources (fetched 25 Sep 2026):
  A  https://commons.wikimedia.org/wiki/File:Toilets_unisex.svg            {{PD-AIGA}}  public domain
     (same drawings: File:Aiga_toiletsq_men.svg, File:Pictograms-nps-accommodations-mens-restroom-2.svg, PD)
  B  https://github.com/mapbox/maki/blob/main/icons/toilet.svg            CC0 1.0
  C  https://github.com/google/material-design-icons  symbols/web/{man,woman}/materialsymbolsrounded/*_fill1_24px.svg
                                                                           Apache License 2.0
Not used: Font Awesome person / person-dress (CC BY 4.0, needs attribution), Toilet_women.svg (CC BY-SA), ISO 7001
(ISO copyright), Otl Aicher's Olympic set (ERCO copyright)."""
import json, math
from geom import rounded_poly, circle, to_unit, mirror_verts, area


def aiga():
    """A — AIGA / US DOT 'Toilets' symbol signs (1974). Public domain (PD-AIGA): measured off Wikimedia
    Commons File:Toilets_unisex.svg, whose man and woman are the airport-sign originals. Units are that
    file's (figure height 571.6). Changes from the reference, all for the 24px tile: head r 46.5 -> 44.5
    so the neck gap is 17 not 13; arm slits 10 -> 13; leg gap 8.6 -> 12.4. Nothing else moved."""
    H = 571.6
    head = circle(0, 44.5, 44.5)
    man = mirror_verts([(111.1, 106.02, 60), (111.1, 330.9, 20.05), (71.0, 330.9, 20.05), (71.0, 179.06, 0),
                        (58.0, 179.06, 0), (58.0, H, 25.9), (6.2, H, 25.9), (6.2, 330.9, 0)])
    # her arm: the outer line leaves the shoulder at 16.8 deg, a 39.4-wide bar ending in a round hand; the
    # inner line is PARALLEL to it (the file's is 0.5 deg off, which leaves a 0.2-unit burr at the hand)
    woman = mirror_verts([(76.57, 106.02, 60), (135.53, 301.81, 19.7), (97.81, 313.17, 19.7), (55.27, 171.9, 0),
                          (42.11, 171.9, 0), (105.13, 388.16, 0), (49.41, 388.16, 0), (49.41, H, 21.6),
                          (6.2, H, 21.6), (6.2, 388.16, 0)])
    return {
        'person': to_unit([head, rounded_poly(man)], 0, H),
        'woman': to_unit([head, rounded_poly(woman)], 0, H),
    }


def _toward(a, b, d):
    L = math.hypot(b[0] - a[0], b[1] - a[1])
    return (a[0] + (b[0] - a[0]) * d / L, a[1] + (b[1] - a[1]) * d / L)


MAKI_WEDGE = 2.3    # see maki(): how far up her arm/dress wedge is filled, in Maki units (figure height 14); measured in page.js legib(): 2.3 leaves one grey dot at 21 and 30px only, clean at 24, 29, 48, 75


def maki(wedge=None, cusp_fix=True):
    """B — Mapbox Maki 'toilet' icon (CC0 1.0, public domain dedication). Units are its 15-unit grid
    (figure height 14). Traced as drawn, with two changes: her two arm/dress junctions, which sit 0.09 apart
    in the file, are made mirror-exact; and the narrow wedge between her arm and her dress is FILLED for its
    first `wedge` units. Drawn as in the file, that wedge is a 10-degree sliver which, at 48px, breaks into
    three pinholes (the review measured them; so did legib() in page.js). Filling its tip leaves a notch that
    is open at the bottom and at least ~0.35 units wide everywhere, so it cannot close into holes."""
    H = 14.0
    wedge = MAKI_WEDGE if wedge is None else wedge
    head = circle(0, 1.5, 1.5)
    torso = rounded_poly([(-2.5, 4, .5), (2.5, 4, .5), (2.5, 9.5, 0), (-2.5, 9.5, 0)])
    # his hands: in the file each is a half-round whose INNER side meets the leg in a zero-width cusp, and a cusp
    # rasterises into pinholes at some sizes (two at 100px). The inner corner is square here; the outer stays round.
    ri = 0 if cusp_fix else .5
    armR = rounded_poly([(1.5, 9, 0), (2.5, 9, 0), (2.5, 10, .5), (1.5, 10, ri)])
    armL = rounded_poly([(-2.5, 9, 0), (-1.5, 9, 0), (-1.5, 10, ri), (-2.5, 10, .5)])
    legR = rounded_poly([(0.5, 9, 0), (1.5, 9, 0), (1.5, 14, .5), (0.5, 14, .5)])
    legL = rounded_poly([(-1.5, 9, 0), (-0.5, 9, 0), (-0.5, 14, .5), (-1.5, 14, .5)])
    pit, hand, hem = (1.63, 5.73), (3.314, 8.682), (3.5, 11)
    if wedge > 0:
        a, b = _toward(pit, hand, wedge), _toward(pit, hem, wedge)
        junction = [(a[0], a[1], 0), (b[0], b[1], 0)]
    else:
        junction = [(pit[0], pit[1], 0)]
    woman = mirror_verts([(1.790, 4, 1), (4.182, 8.186, .5), (hand[0], hand[1], .5)] + junction +
                         [(hem[0], hem[1], 0), (1.5, 11, 0), (1.5, 14, .5), (0.5, 14, .5), (0.5, 11, 0)])
    return {
        'person': to_unit([head, torso, legL, legR, armL, armR], 0, H),
        'woman': to_unit([head, rounded_poly(woman)], 0, H),
    }


def material():
    """C — Google Material Symbols 'man' and 'woman', Rounded style (Apache License 2.0). Units are its
    960 grid, head top at 0 (figure height 800). Traced as drawn: no arms, one leg column — that IS the
    design, and it is why the suite's arms/legs rules would have to go if he picks it."""
    H = 800.0
    head = circle(0, 80, 80)
    man = mirror_verts([(160, 200, 80), (160, 520, 40), (80, 520, 0), (80, 800, 40)])
    w_half = [(0, 54.6, 84), (199.7, 560, 40), (80, 560, 0), (80, 800, 40)]
    woman = w_half + [(-x, y, r) for (x, y, r) in reversed(w_half[1:])]
    return {
        'person': to_unit([head, rounded_poly(man)], 0, H),
        'woman': to_unit([head, rounded_poly(woman)], 0, H),
    }


OPTIONS = {'aiga': aiga(), 'maki': maki(), 'material': material()}

if __name__ == '__main__':
    for k, v in OPTIONS.items():
        for kind in ('person', 'woman'):
            signs = [round(area(p), 5) for p in v[kind]]
            assert all(s > 0 for s in signs), (k, kind, signs)   # every part clockwise = no accidental holes
    print(json.dumps(OPTIONS))
