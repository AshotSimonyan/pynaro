import { Defs, LinearGradient, Path, Stop, Svg } from "react-native-svg";

import { colors } from "@/theme";

/**
 * The Pynaro pin, ported path-for-path from the prototype's
 * `public/pynaro-mark.svg`.
 *
 * Inline SVG rather than a PNG so one component serves the 94×115 welcome
 * mark, the 54×66 card mark on the permissions screen and whatever the tab bar
 * needs later, all crisp and all one file to change when the brand does.
 *
 * `aspectRatio` is 72/88, so callers set a height or a width and the other
 * follows rather than being computed at every call site.
 */
const VIEW_BOX_WIDTH = 72;
const VIEW_BOX_HEIGHT = 88;

export type PynaroMarkProps = {
  /** Height in points. The width follows the mark's own aspect ratio. */
  height?: number;
};

export function PynaroMark({ height = VIEW_BOX_HEIGHT }: PynaroMarkProps) {
  const width = (height * VIEW_BOX_WIDTH) / VIEW_BOX_HEIGHT;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`}
      // One label for the whole mark. Without this the pin and the glyph are
      // two unlabelled shapes to a screen reader, and with `role="image"` the
      // children stop being announced separately.
      accessibilityRole="image"
      accessibilityLabel="Pynaro"
    >
      <Defs>
        <LinearGradient
          id="pynaroMark"
          x1="8"
          y1="5"
          x2="62"
          y2="78"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor={colors.brandMarkStart} />
          <Stop offset="1" stopColor={colors.brandMarkEnd} />
        </LinearGradient>
      </Defs>
      <Path
        fill="url(#pynaroMark)"
        d="M36 2C17.8 2 3 16.8 3 35c0 24.4 33 51 33 51s33-26.6 33-51C69 16.8 54.2 2 36 2Z"
      />
      <Path
        fill={colors.brandMarkGlyph}
        d="M24 64V24h14.2c11.9 0 19.3 6.5 19.3 16.5S50 57 38.2 57h-5.5v7H24Zm8.7-15h5.2c6.5 0 10.5-3 10.5-8.5 0-5.6-4-8.5-10.5-8.5h-5.2v17Z"
      />
    </Svg>
  );
}
