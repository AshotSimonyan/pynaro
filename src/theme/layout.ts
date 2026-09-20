/**
 * Spacing and radii. The prototype's `--radius` is 0.85rem, which is 13.6px and
 * rounds to 14; its sm/md/lg/xl derivations follow the same offsets it uses.
 */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 9,
  md: 12,
  lg: 14,
  xl: 19,
  xxl: 24,
  pill: 999,
} as const;

/** Hairlines the prototype draws at 1px. */
export const borderWidth = {
  hairline: 1,
  thick: 2,
} as const;

export type Spacing = keyof typeof spacing;
export type Radius = keyof typeof radius;
