/**
 * Ported from the prototype's `app/globals.css` :root block.
 *
 * The prototype was rebranded from green to blue but its CSS still carries the
 * old green literals in places; only the :root tokens are authoritative, so
 * only those are ported here.
 */
const palette = {
  blue: "#075cf2",
  blueDark: "#063b9d",
  blueTint: "#eaf2ff",
  ink: "#071a3b",
  inkSoft: "#26344f",
  slate: "#6b7b77",
  cream: "#f3f6fb",
  white: "#ffffff",
  line: "#d9e0eb",
  lineSoft: "#e1e7f0",
  mist: "#f1f2ee",
  mistDeep: "#edf1ed",
  coral: "#e97a61",
  red: "#c94d42",
  redTint: "#fbeae8",
  green: "#128d46",
  greenTint: "#e8f9ef",
  amber: "#ef8b24",
  amberTint: "#fdf1e3",
} as const;

/**
 * Semantic tokens. Components name the role, never the hue, so a palette change
 * stays inside this file.
 */
export const colors = {
  background: palette.cream,
  surface: palette.white,
  surfaceMuted: palette.mist,
  surfaceSunken: palette.mistDeep,
  overlay: "rgba(7, 26, 59, 0.45)",

  primary: palette.blue,
  primaryPressed: palette.blueDark,
  primaryMuted: palette.blueTint,
  onPrimary: palette.white,

  text: palette.ink,
  textSubtle: palette.inkSoft,
  textMuted: palette.slate,
  textOnDark: palette.white,
  textDisabled: "#9aa6b8",

  border: palette.line,
  borderSubtle: palette.lineSoft,
  focusRing: "rgba(7, 92, 242, 0.16)",

  success: palette.green,
  successMuted: palette.greenTint,
  warning: palette.amber,
  warningMuted: palette.amberTint,
  danger: palette.red,
  dangerMuted: palette.redTint,
  onDanger: palette.white,
  accent: palette.coral,

  transparent: "transparent",
} as const;

/**
 * Per-category accents from the prototype's `lib/pynaro-data.ts`. The catalog
 * itself is served by the mock (step 4) and later by the API, so this is the
 * presentation side only: a category id maps to the colour the grid draws it in.
 */
export const categoryAccents: Record<string, string> = {
  plumbing: "#3f9ee8",
  hvac: "#6878e8",
  locksmith: "#e89a3f",
  electrical: "#e6b63d",
  appliance: "#986fda",
  cleaning: "#dd73a1",
  handyman: "#c8754e",
  garage: "#75899d",
  pest: "#7d9f50",
  auto: "#e6665f",
  roofing: "#896957",
  landscaping: "#48a071",
};

/** Falls back to the brand colour for a category the app does not know yet. */
export function categoryAccent(categoryId: string): string {
  return categoryAccents[categoryId] ?? colors.primary;
}
