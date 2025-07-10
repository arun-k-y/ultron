import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

interface CircularProgressProps {
  progress?: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  progress = 0,
  size = 160,
  strokeWidth = 10,
  children,
}) => {
  const radius = (size - strokeWidth) / 2;

  // Calculate the path for the black fill that grows clockwise
  const centerX = size / 2;
  const centerY = size / 2;
  const fillRadius = radius - strokeWidth / 2;

  const createClockwisePath = (progress: number): string => {
    if (progress <= 0) return "";
    if (progress >= 1) {
      // Full circle
      return `M ${centerX} ${centerY} m -${fillRadius} 0 a ${fillRadius} ${fillRadius} 0 1 1 ${
        fillRadius * 2
      } 0 a ${fillRadius} ${fillRadius} 0 1 1 -${fillRadius * 2} 0`;
    }

    // Calculate end point for the arc
    const angle = progress * 2 * Math.PI - Math.PI / 2; // Start from top (-90 degrees)
    const endX = centerX + fillRadius * Math.cos(angle);
    const endY = centerY + fillRadius * Math.sin(angle);

    const largeArcFlag = progress > 0.5 ? 1 : 0;

    return `M ${centerX} ${centerY} L ${centerX} ${
      centerY - fillRadius
    } A ${fillRadius} ${fillRadius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* White background circle */}
        <Circle fill="white" cx={size / 2} cy={size / 2} r={fillRadius} />

        {/* Black fill that grows clockwise */}
        <Path d={createClockwisePath(progress)} fill="black" />

        {/* Outer progress ring - white background */}
        <Circle
          stroke="white"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />

        {/* Progress ring - green */}
        <Circle
          stroke="white"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CircularProgress; 