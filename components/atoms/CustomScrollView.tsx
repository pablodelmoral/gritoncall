import React, { useState, useRef } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { ScrollViewProps } from 'react-native';

interface CustomScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
  showScrollbar?: boolean;
}

export default function CustomScrollView({ 
  children, 
  showScrollbar = true, 
  style, 
  ...props 
}: CustomScrollViewProps) {
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    setScrollY(contentOffset.y);
    setContentHeight(contentSize.height);
    setScrollViewHeight(layoutMeasurement.height);
    
    // Call original onScroll if provided
    if (props.onScroll) {
      props.onScroll(event);
    }
  };

  const scrollbarHeight = scrollViewHeight > 0 && contentHeight > 0 
    ? Math.max((scrollViewHeight / contentHeight) * scrollViewHeight, 30)
    : 0;

  const scrollbarTop = scrollViewHeight > 0 && contentHeight > 0
    ? (scrollY / (contentHeight - scrollViewHeight)) * (scrollViewHeight - scrollbarHeight)
    : 0;

  const showScrollbarIndicator = showScrollbar && contentHeight > scrollViewHeight && scrollViewHeight > 0;

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        ref={scrollViewRef}
        {...props}
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      
      {showScrollbarIndicator && (
        <View style={styles.scrollbarTrack}>
          <View 
            style={[
              styles.scrollbarThumb,
              {
                height: scrollbarHeight,
                transform: [{ translateY: scrollbarTop }]
              }
            ]} 
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollbarTrack: {
    position: 'absolute',
    right: 2,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
  },
  scrollbarThumb: {
    width: 4,
    backgroundColor: '#FF0000',
    borderRadius: 2,
    opacity: 0.8,
  },
});
