import type { ViewStyle } from "react-native";

/**
 * Three elevations, matching the prototype's card, raised card and overlay
 * shadows. `elevation` covers Android, the `shadow*` props cover iOS.
 */
export const shadows = {
  none: {},
  sm: {
    shadowColor: "#0e2320",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  md: {
    shadowColor: "#0e2320",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  lg: {
    shadowColor: "#0e2320",
    shadowOpacity: 0.16,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
} as const satisfies Record<string, ViewStyle>;

export type Elevation = keyof typeof shadows;
