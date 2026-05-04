// Jump the Book — logo marks (4 options)
// Direct port of source-from-canvas/logos.jsx. Recommended default: <LogoCrescent />,
// which is the mark used in the canvas's standalone hero. Use react-native-svg.
//
// Required: npx expo install react-native-svg

import React from "react";
import Svg, { Circle, Ellipse, Path, Rect, G, Line } from "react-native-svg";
import { colors } from "./tokens";

interface MarkProps {
  size?: number;
  color?: string;
}

/* 1. CRESCENT — rabbit silhouette inside a moon. The featured mark. */
export function LogoCrescent({ size = 64, color = colors.accent }: MarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Circle cx={32} cy={32} r={30} stroke={color} strokeWidth={1.5} opacity={0.4} />
      <Path d="M32 6 a26 26 0 1 0 0 52 a20 20 0 1 1 0 -52z" fill={color} />
      <G transform="translate(20 16)">
        <Ellipse cx={10} cy={22} rx={8} ry={9} fill={colors.ink900} />
        <Ellipse cx={6}  cy={10} rx={2.2} ry={7} fill={colors.ink900} transform="rotate(-10 6 10)" />
        <Ellipse cx={13} cy={10} rx={2.2} ry={7} fill={colors.ink900} transform="rotate(10 13 10)" />
        <Circle cx={13} cy={20} r={0.9} fill={color} />
      </G>
    </Svg>
  );
}

/* 2. COMPASS — rabbit ears as compass needle. */
export function LogoCompass({ size = 64, color = colors.accent }: MarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Circle cx={32} cy={32} r={29} stroke={color} strokeWidth={1.25} opacity={0.5} />
      <Circle cx={32} cy={32} r={22} stroke={color} strokeWidth={1} opacity={0.25} />
      {[0, 90, 180, 270].map((a) => (
        <Line key={a} x1={32} y1={4} x2={32} y2={9} stroke={color} strokeWidth={1.5} transform={`rotate(${a} 32 32)`} />
      ))}
      <Path d="M32 8 L27 30 L32 26 L37 30 Z" fill={color} />
      <Path d="M32 56 L29 38 L32 41 L35 38 Z" fill={color} opacity={0.55} />
      <Circle cx={32} cy={32} r={2.5} fill={colors.ink900} stroke={color} strokeWidth={1.25} />
    </Svg>
  );
}

/* 3. JUMP — geometric rabbit head, pure silhouette. */
export function LogoJump({ size = 64, color = colors.accent }: MarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Rect x={20} y={6} width={9} height={28} rx={4.5} fill={color} transform="rotate(-12 24.5 20)" />
      <Rect x={35} y={6} width={9} height={28} rx={4.5} fill={color} transform="rotate(12 39.5 20)" />
      <Rect x={22.5} y={11} width={4} height={18} rx={2} fill={colors.ink900} transform="rotate(-12 24.5 20)" />
      <Rect x={37.5} y={11} width={4} height={18} rx={2} fill={colors.ink900} transform="rotate(12 39.5 20)" />
      <Circle cx={32} cy={40} r={18} fill={color} />
      <Circle cx={25} cy={38} r={1.6} fill={colors.ink900} />
      <Circle cx={39} cy={38} r={1.6} fill={colors.ink900} />
      <Path d="M32 44 L30 47 L34 47 Z" fill={colors.ink900} />
    </Svg>
  );
}

/* 4. PORTAL — open book whose pages frame a rabbit silhouette. */
export function LogoPortal({ size = 64, color = colors.accent }: MarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path d="M6 14 L32 18 L32 56 L6 52 Z" fill={color} fillOpacity={0.18} stroke={color} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M58 14 L32 18 L32 56 L58 52 Z" fill={color} fillOpacity={0.18} stroke={color} strokeWidth={1.25} strokeLinejoin="round" />
      <Line x1={32} y1={18} x2={32} y2={56} stroke={color} strokeWidth={1} opacity={0.55} />
      <G>
        <Ellipse cx={28} cy={14} rx={2} ry={6} fill={color} transform="rotate(-8 28 14)" />
        <Ellipse cx={36} cy={14} rx={2} ry={6} fill={color} transform="rotate(8 36 14)" />
        <Circle cx={32} cy={22} r={6} fill={color} />
      </G>
    </Svg>
  );
}

// Default export = the featured mark
export const Logo = LogoCrescent;
