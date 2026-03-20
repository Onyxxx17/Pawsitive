import { Platform } from 'react-native';

const MEDIAPIPE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const DOG_DETECTOR_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite';

type MediaPipeObjectDetector = {
  detect: (
    image: HTMLImageElement,
  ) => {
    detections?: {
      categories?: {
        score: number;
        categoryName: string;
      }[];
      boundingBox?: {
        originX: number;
        originY: number;
        width: number;
        height: number;
      };
    }[];
  };
};

export type DogDetectionBox = {
  left: number;
  top: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  coverage: number;
  aspectRatio: number;
};

export type DogDetectionResult = {
  confidence: number;
  box: DogDetectionBox;
};

let detectorPromise: Promise<MediaPipeObjectDetector> | null = null;

const isWebRuntime = () => Platform.OS === 'web' && typeof window !== 'undefined';

async function getDogDetector(): Promise<MediaPipeObjectDetector | null> {
  if (!isWebRuntime()) {
    return null;
  }

  if (!detectorPromise) {
    detectorPromise = (async () => {
      const { FilesetResolver, ObjectDetector } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);

      return ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: DOG_DETECTOR_MODEL_URL,
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        categoryAllowlist: ['dog'],
        maxResults: 3,
        scoreThreshold: 0.16,
      });
    })().catch((error) => {
      detectorPromise = null;
      throw error;
    });
  }

  return detectorPromise;
}

export async function detectDogInWebImage(
  image: HTMLImageElement,
): Promise<DogDetectionResult | null | undefined> {
  if (!isWebRuntime()) {
    return undefined;
  }

  try {
    const detector = await getDogDetector();

    if (!detector) {
      return undefined;
    }

    const detections = detector.detect(image).detections ?? [];
    let bestMatch: DogDetectionResult | null = null;

    detections.forEach((detection) => {
      const category = detection.categories?.find(
        (entry) => entry.categoryName.toLowerCase() === 'dog',
      );
      const boundingBox = detection.boundingBox;

      if (!category || !boundingBox) {
        return;
      }

      const normalizedWidth = boundingBox.width / Math.max(image.naturalWidth || image.width, 1);
      const normalizedHeight = boundingBox.height / Math.max(image.naturalHeight || image.height, 1);
      const normalizedLeft = boundingBox.originX / Math.max(image.naturalWidth || image.width, 1);
      const normalizedTop = boundingBox.originY / Math.max(image.naturalHeight || image.height, 1);

      const match: DogDetectionResult = {
        confidence: category.score,
        box: {
          left: normalizedLeft,
          top: normalizedTop,
          width: normalizedWidth,
          height: normalizedHeight,
          centerX: normalizedLeft + normalizedWidth / 2,
          centerY: normalizedTop + normalizedHeight / 2,
          coverage: normalizedWidth * normalizedHeight,
          aspectRatio: normalizedWidth / Math.max(normalizedHeight, 0.0001),
        },
      };

      if (!bestMatch || match.confidence > bestMatch.confidence) {
        bestMatch = match;
      }
    });

    return bestMatch;
  } catch {
    return undefined;
  }
}
