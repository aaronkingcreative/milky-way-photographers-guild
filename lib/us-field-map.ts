/**
 * Compact layout for a public US field map.
 * Positions are typographic, not a survey, and only USPS codes are used.
 */

export type StateAnchor = { code: string; x: number; y: number; size?: "s" | "m" };

/** ViewBox width and height for the field map. */
export const US_MAP_VIEWBOX = "0 0 1000 620";

/** Approximate label anchors for a compact continental layout, with AK and HI as insets. */
export const US_STATE_ANCHORS: StateAnchor[] = [
  { code: "WA", x: 168, y: 88 },
  { code: "OR", x: 158, y: 150 },
  { code: "CA", x: 148, y: 262 },
  { code: "ID", x: 205, y: 128 },
  { code: "NV", x: 188, y: 214 },
  { code: "UT", x: 225, y: 228 },
  { code: "AZ", x: 205, y: 312 },
  { code: "MT", x: 305, y: 88 },
  { code: "WY", x: 305, y: 172 },
  { code: "CO", x: 318, y: 238 },
  { code: "NM", x: 305, y: 318 },
  { code: "ND", x: 418, y: 88 },
  { code: "SD", x: 418, y: 158 },
  { code: "NE", x: 418, y: 222 },
  { code: "KS", x: 428, y: 282 },
  { code: "OK", x: 438, y: 345 },
  { code: "TX", x: 400, y: 430 },
  { code: "MN", x: 508, y: 108 },
  { code: "IA", x: 508, y: 198 },
  { code: "MO", x: 518, y: 278 },
  { code: "AR", x: 528, y: 348 },
  { code: "LA", x: 528, y: 428 },
  { code: "WI", x: 568, y: 138 },
  { code: "IL", x: 568, y: 248 },
  { code: "MS", x: 568, y: 398 },
  { code: "MI", x: 638, y: 148 },
  { code: "IN", x: 618, y: 248 },
  { code: "KY", x: 628, y: 302 },
  { code: "TN", x: 628, y: 342 },
  { code: "AL", x: 618, y: 398 },
  { code: "OH", x: 688, y: 238 },
  { code: "WV", x: 728, y: 278 },
  { code: "GA", x: 668, y: 398 },
  { code: "FL", x: 708, y: 468 },
  { code: "PA", x: 768, y: 218 },
  { code: "VA", x: 768, y: 298 },
  { code: "NC", x: 778, y: 348 },
  { code: "SC", x: 748, y: 388 },
  { code: "NY", x: 808, y: 168 },
  { code: "NJ", x: 848, y: 228, size: "s" },
  { code: "MD", x: 818, y: 268, size: "s" },
  { code: "DE", x: 858, y: 258, size: "s" },
  { code: "CT", x: 868, y: 198, size: "s" },
  { code: "RI", x: 892, y: 208, size: "s" },
  { code: "MA", x: 878, y: 172, size: "s" },
  { code: "VT", x: 848, y: 138, size: "s" },
  { code: "NH", x: 872, y: 138, size: "s" },
  { code: "ME", x: 918, y: 98 },
  { code: "AK", x: 168, y: 545 },
  { code: "HI", x: 305, y: 555 },
  { code: "DC", x: 798, y: 278, size: "s" },
];

/** Simplified continental silhouette plus Alaska and Hawaii insets. Public-domain style outline. */
export const US_LAND_PATHS = {
  continent:
    "M148 52 L178 58 L198 48 L250 52 L310 46 L390 50 L470 44 L530 52 L560 42 L575 70 " +
    "L590 62 L600 88 L618 78 L640 110 L668 96 L690 128 L705 118 L700 150 L748 138 " +
    "L780 128 L805 148 L795 168 L830 155 L870 148 L900 118 L930 108 L948 128 L938 155 " +
    "L910 175 L888 198 L895 220 L872 235 L858 250 L850 268 L838 278 L855 292 L830 310 " +
    "L822 335 L848 348 L820 362 L800 355 L782 372 L760 365 L742 390 L720 385 L705 430 " +
    "L728 455 L755 470 L780 510 L768 530 L742 545 L710 528 L690 500 L678 470 L650 455 " +
    "L640 478 L610 455 L590 448 L570 468 L545 455 L530 478 L508 462 L495 430 L478 448 " +
    "L455 430 L430 455 L400 442 L360 428 L330 448 L300 430 L280 448 L250 430 L230 400 " +
    "L200 385 L175 350 L155 330 L148 300 L132 270 L118 230 L108 190 L115 150 L128 110 Z",
  lakes:
    "M620 95 L655 108 L670 140 L650 168 L618 155 L600 125 Z M575 88 L605 95 L600 120 L575 112 Z",
  alaska:
    "M70 500 L150 492 L195 510 L210 545 L185 575 L140 585 L95 570 L60 545 L48 520 Z",
  hawaii:
    "M275 545 L292 542 L300 552 L290 560 L275 556 Z M308 548 L328 545 L340 558 L322 565 L308 558 Z M348 552 L362 550 L368 560 L355 564 Z",
};
