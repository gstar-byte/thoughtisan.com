import React from 'react';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = {
  width?: number;
  height?: number;
};

/** 与 web `AppLogo` 同一视觉（便签 + 三色胶囊条），便于双端识别一致。 */
export function AppLogo({ width = 36, height = 36 }: Props) {
  const suffix = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const cap1 = `cap1-${suffix}`;
  const cap2 = `cap2-${suffix}`;
  const cap3 = `cap3-${suffix}`;

  return (
    <Svg width={width} height={height} viewBox="0 0 100 100" fill="none">
      <Defs>
        <LinearGradient id={cap1} x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
          <Stop offset="0" stopColor="#007AFF" />
          <Stop offset="1" stopColor="#5AC8FA" />
        </LinearGradient>
        <LinearGradient id={cap2} x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
          <Stop offset="0" stopColor="#FF2D55" />
          <Stop offset="1" stopColor="#FF375F" />
        </LinearGradient>
        <LinearGradient id={cap3} x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
          <Stop offset="0" stopColor="#34C759" />
          <Stop offset="1" stopColor="#30D158" />
        </LinearGradient>
      </Defs>
      <Path
        d="M15 15 H85 V70 L70 85 H15 V15Z"
        fill="#FEFBEC"
        stroke="#EAE4C3"
        strokeWidth={1}
      />
      <Path d="M85 70 H70 V85 L85 70Z" fill="#E5DFA9" stroke="#EAE4C3" strokeWidth={1} />
      <Rect x={28} y={28} width={44} height={12} rx={6} fill={`url(#${cap1})`} />
      <Rect x={28} y={44} width={36} height={12} rx={6} fill={`url(#${cap2})`} />
      <Rect x={28} y={60} width={40} height={12} rx={6} fill={`url(#${cap3})`} />
    </Svg>
  );
}
