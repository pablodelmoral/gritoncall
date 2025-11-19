import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const BAR_HEIGHT = 32;

interface FlameElementProps {
  index: number;
  progress: number;
  randomLeft: number;
  barWidth: number;
}

const FlameElement: React.FC<FlameElementProps> = ({ index, progress, randomLeft, barWidth }) => {
  const [animatedValue] = useState(new Animated.Value(0));
  const [opacityValue] = useState(new Animated.Value(0.5));

  // Random duration and delay for chaotic flicker effect (0.5-1.3s)
  const randomDuration = 500 + Math.random() * 800;
  const randomDelay = Math.random() * 600;

  // Calculate local progress based on flame particle's horizontal position
  const localProgressScale = (randomLeft / 100) * 100;
  const effectiveProgress = Math.min(progress, localProgressScale);
  
  // Add random size variation (±20%) for more realistic flames
  const randomSizeVariation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
  const size = (8 + (effectiveProgress / 100) * 10) * randomSizeVariation;

  // Dynamic Color Palette
  const baseColors = [
    'rgba(255, 255, 150, 0.9)',  // Bright Yellow
    'rgba(255, 200, 50, 0.9)',   // Light Orange
    'rgba(255, 150, 0, 0.9)',    // Medium Orange
    'rgba(255, 255, 200, 0.9)',  // Near-White
    'rgba(255, 120, 0, 0.9)',    // Vibrant Orange
    'rgba(255, 180, 0, 0.9)',    // Deep Gold
  ];

  const maxColorIndex = Math.min(baseColors.length, Math.floor((effectiveProgress / 100) * (baseColors.length - 1)) + 2);
  const availableColors = baseColors.slice(0, maxColorIndex);
  const color = availableColors[Math.floor(Math.random() * availableColors.length)];

  // Dynamic max height based on effective progress
  const maxAnimationHeight = 40;
  const scaledHeight = (effectiveProgress / 100) * maxAnimationHeight;

  useEffect(() => {
    // Start animation after random delay
    const delayTimeout = setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(animatedValue, {
              toValue: -scaledHeight,
              duration: randomDuration,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(opacityValue, {
              toValue: 0.9,
              duration: randomDuration * 0.3,
              useNativeDriver: true,
            }),
            Animated.timing(opacityValue, {
              toValue: 0.6,
              duration: randomDuration * 0.4,
              useNativeDriver: true,
            }),
            Animated.timing(opacityValue, {
              toValue: 0,
              duration: randomDuration * 0.3,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    }, randomDelay);

    return () => clearTimeout(delayTimeout);
  }, [scaledHeight, randomDuration, randomDelay]);

  const width = size * 0.9;
  const height = size * 1.8;
  
  // SVG path for flame shape: rounded bottom, pointed tip
  const flamePath = `
    M ${width / 2} 0
    Q ${width * 0.8} ${height * 0.3} ${width} ${height * 0.6}
    Q ${width} ${height * 0.8} ${width * 0.7} ${height}
    Q ${width / 2} ${height * 0.95} ${width * 0.3} ${height}
    Q 0 ${height * 0.8} 0 ${height * 0.6}
    Q ${width * 0.2} ${height * 0.3} ${width / 2} 0
    Z
  `;

  // Create blur effect with multiple layers
  const createBlurLayers = () => {
    const layers = [];
    const blurSteps = 3;
    
    for (let i = blurSteps; i >= 0; i--) {
      const scale = 1 + (i * 0.15);
      const opacity = 0.3 / (i + 1);
      const scaledPath = `
        M ${(width / 2) * scale} 0
        Q ${(width * 0.8) * scale} ${(height * 0.3) * scale} ${width * scale} ${(height * 0.6) * scale}
        Q ${width * scale} ${(height * 0.8) * scale} ${(width * 0.7) * scale} ${height * scale}
        Q ${(width / 2) * scale} ${(height * 0.95) * scale} ${(width * 0.3) * scale} ${height * scale}
        Q 0 ${(height * 0.8) * scale} 0 ${(height * 0.6) * scale}
        Q ${(width * 0.2) * scale} ${(height * 0.3) * scale} ${(width / 2) * scale} 0
        Z
      `;
      
      layers.push(
        <Path
          key={`blur-${i}`}
          d={scaledPath}
          fill={color}
          opacity={opacity}
        />
      );
    }
    
    return layers;
  };

  return (
    <Animated.View
      style={[
        styles.flameParticle,
        {
          left: (randomLeft / 100) * barWidth,
          opacity: opacityValue,
          transform: [{ translateY: animatedValue }],
        },
      ]}
    >
      <Svg width={width * 1.5} height={height * 1.5} style={{ overflow: 'visible' }}>
        {createBlurLayers()}
        <Path
          d={flamePath}
          fill={color}
        />
      </Svg>
    </Animated.View>
  );
};

interface FlameProgressBarProps {
  progress: number; // 0-100 (visual progress)
  days?: number; // Actual day count (0-30)
  label?: string;
}

const FlameProgressBar: React.FC<FlameProgressBarProps> = ({ progress, days, label }) => {
  const [animatedProgress] = useState(new Animated.Value(0));
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Determine base colors based on progress level
  const getGradientColors = (): [string, string, string] => {
    if (progress < 50) {
      return ['rgba(255, 165, 0, 0.9)', 'rgba(255, 200, 50, 1)', 'rgba(255, 255, 150, 0.9)'];
    } else if (progress < 90) {
      return ['rgba(255, 99, 71, 0.9)', 'rgba(255, 150, 0, 1)', 'rgba(255, 255, 150, 0.9)'];
    } else {
      return ['rgba(255, 0, 0, 0.9)', 'rgba(255, 100, 0, 1)', 'rgba(255, 255, 150, 0.9)'];
    }
  };

  // Dynamic flame container height
  const flameContainerHeight = (progress / 100) * 90 + 30;

  // Dynamic Density: Min 40 particles, Max 180 particles (matching original)
  const numParticles = Math.floor((progress / 100) * 140) + 40;

  // Generate flame elements
  const flameElements = useMemo(() => {
    if (progress === 0 || barWidth === 0) return null;
    
    const progressBarWidth = (progress / 100) * barWidth;
    
    return Array.from({ length: numParticles }).map((_, index) => {
      const randomLeft = Math.random() * 90 + 5;
      return (
        <FlameElement
          key={index}
          index={index}
          progress={progress}
          randomLeft={randomLeft}
          barWidth={progressBarWidth}
        />
      );
    });
  }, [progress, numParticles, barWidth]);

  const progressBarWidth = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={styles.progressContainer}>
        {/* Progress Bar Track */}
        <View 
          style={styles.track}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        >
          {/* Progress Bar Fill */}
          <Animated.View style={[styles.fillContainer, { width: progressBarWidth }]}>
            <LinearGradient
              colors={getGradientColors()}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fill}
            />
          </Animated.View>

          {/* Flame Container */}
          {progress > 0 && (
            <View
              style={[
                styles.flameContainer,
                {
                  height: flameContainerHeight,
                  width: `${Math.max(0, progress - 2)}%`,
                },
              ]}
            >
              {flameElements}
            </View>
          )}
        </View>

        {/* Progress Text - Show actual days */}
        <Text style={styles.progressText}>{days !== undefined ? Math.round(days) : Math.round((progress / 100) * 30)} DAYS</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressContainer: {
    height: 80,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: BAR_HEIGHT,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    overflow: 'visible',
    position: 'relative',
  },
  fillContainer: {
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
    shadowColor: '#FF6600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  flameContainer: {
    position: 'absolute',
    bottom: BAR_HEIGHT - 28,
    left: 0,
    overflow: 'visible',
    pointerEvents: 'none',
  },
  flameParticle: {
    position: 'absolute',
    bottom: 0,
  },
  progressText: {
    position: 'absolute',
    right: 12,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Akira-Extended',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default FlameProgressBar;
