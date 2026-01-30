import { useRef, useCallback } from 'react';
import { Animated, PanResponder, Dimensions } from 'react-native';

interface UseDragToDismissOptions {
  threshold?: number;
  onDismissStart?: () => void;
}

interface UseDragToDismissReturn {
  translateY: Animated.Value;
  panResponder: ReturnType<typeof PanResponder.create>;
  resetPosition: () => void;
}

export function useDragToDismiss(
  onDismiss: () => void,
  options: UseDragToDismissOptions = {}
): UseDragToDismissReturn {
  const { threshold = 120, onDismissStart } = options;
  const screenHeight = Dimensions.get('window').height;
  const translateY = useRef(new Animated.Value(0)).current;

  const resetPosition = useCallback(() => {
    translateY.setValue(0);
  }, [translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > threshold) {
          onDismissStart?.();
          Animated.timing(translateY, {
            toValue: screenHeight,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onDismiss();
            translateY.setValue(0);
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  return { translateY, panResponder, resetPosition };
}
