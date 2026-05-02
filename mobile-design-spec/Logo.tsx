// Jump the Book — bunny logo as React Native SVG
// Direct port of artifacts/jump-the-book-web/public/logo.svg.
// Renders crisply at any size.
//
// Required: npx expo install react-native-svg

import React from "react";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Ellipse,
  Circle,
  Path,
  G,
} from "react-native-svg";

interface LogoProps {
  size?: number;
}

export function Logo({ size = 28 }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#f5d27c" />
          <Stop offset="100%" stopColor="#b8841f" />
        </LinearGradient>
        <LinearGradient id="gi" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#7a4d10" />
          <Stop offset="100%" stopColor="#3a2207" />
        </LinearGradient>
      </Defs>
      {/* Left ear */}
      <Ellipse cx={22} cy={20} rx={5.5} ry={14}
        transform="rotate(-14 22 20)" fill="url(#g)" />
      <Ellipse cx={22.5} cy={22} rx={2.2} ry={9}
        transform="rotate(-14 22.5 22)" fill="url(#gi)" />
      {/* Right ear */}
      <Ellipse cx={42} cy={20} rx={5.5} ry={14}
        transform="rotate(14 42 20)" fill="url(#g)" />
      <Ellipse cx={41.5} cy={22} rx={2.2} ry={9}
        transform="rotate(14 41.5 22)" fill="url(#gi)" />
      {/* Head */}
      <Ellipse cx={32} cy={42} rx={16} ry={14} fill="url(#g)" />
      {/* Eyes */}
      <Circle cx={26} cy={40} r={1.6} fill="#0a0a0f" />
      <Circle cx={38} cy={40} r={1.6} fill="#0a0a0f" />
      {/* Nose */}
      <Path d="M30 46 Q32 48 34 46 L32 49 Z" fill="#0a0a0f" />
      {/* Whiskers */}
      <G opacity={0.6} stroke="#0a0a0f" strokeWidth={0.6} strokeLinecap="round">
        <Path d="M22 47 L18 46" />
        <Path d="M22 49 L18 50" />
        <Path d="M42 47 L46 46" />
        <Path d="M42 49 L46 50" />
      </G>
    </Svg>
  );
}
