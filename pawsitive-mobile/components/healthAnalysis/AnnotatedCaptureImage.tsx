import React, { useMemo, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { QualityGateResult } from '@/utils/scanQuality';

type AnnotatedCaptureImageProps = {
  uri: string;
  quality?: QualityGateResult;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

type FrameSize = {
  width: number;
  height: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function AnnotatedCaptureImage({
  uri,
  quality,
  accessibilityLabel,
  style,
}: AnnotatedCaptureImageProps) {
  const [frameSize, setFrameSize] = useState<FrameSize>({ width: 0, height: 0 });
  const detectedDog = quality?.detectedDog;
  const imageDimensions = quality?.dimensions;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setFrameSize({ width, height });
  };

  const dogBoxStyle = useMemo(() => {
    if (!detectedDog || !imageDimensions || frameSize.width === 0 || frameSize.height === 0) {
      return null;
    }

    const imageAspect = imageDimensions.width / Math.max(imageDimensions.height, 1);
    const frameAspect = frameSize.width / Math.max(frameSize.height, 1);

    let renderedWidth = frameSize.width;
    let renderedHeight = frameSize.height;
    let offsetX = 0;
    let offsetY = 0;

    if (imageAspect > frameAspect) {
      renderedHeight = frameSize.width / Math.max(imageAspect, 0.0001);
      offsetY = (frameSize.height - renderedHeight) / 2;
    } else {
      renderedWidth = frameSize.height * imageAspect;
      offsetX = (frameSize.width - renderedWidth) / 2;
    }

    const left = offsetX + detectedDog.box.left * renderedWidth;
    const top = offsetY + detectedDog.box.top * renderedHeight;
    const width = detectedDog.box.width * renderedWidth;
    const height = detectedDog.box.height * renderedHeight;

    const clampedLeft = clamp(left, 0, Math.max(frameSize.width - 16, 0));
    const clampedTop = clamp(top, 0, Math.max(frameSize.height - 16, 0));

    return {
      left: clampedLeft,
      top: clampedTop,
      width: clamp(width, 16, Math.max(frameSize.width - clampedLeft, 16)),
      height: clamp(height, 16, Math.max(frameSize.height - clampedTop, 16)),
    };
  }, [detectedDog, frameSize.height, frameSize.width, imageDimensions]);

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      <Image
        source={{ uri }}
        style={styles.image}
        resizeMode="contain"
        accessibilityLabel={accessibilityLabel}
      />

      {dogBoxStyle ? (
        <View pointerEvents="none" style={[styles.box, dogBoxStyle]}>
          <View style={styles.labelPill}>
            <Text style={styles.labelText}>
              Dog {Math.round((detectedDog?.confidence || 0) * 100)}%
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  box: {
    position: 'absolute',
    borderWidth: 3,
    borderRadius: 16,
    borderColor: '#FF8A34',
    backgroundColor: 'rgba(255, 138, 52, 0.08)',
  },
  labelPill: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 999,
    backgroundColor: '#FF8A34',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  labelText: {
    color: '#FFF9F2',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
