import { Image, Platform } from 'react-native';

import { AnalysisType, SCAN_GUIDE_BY_KEY } from '@/constants/scanGuides';
import { detectDogInWebImage, type DogDetectionBox } from '@/utils/mediaPipeDogDetection';

export type QualityGateStatus = 'pass' | 'warn' | 'block';
export type QualityIssueSeverity = 'warn' | 'block';
export type QualityIssueCode =
  | 'bad_aspect_ratio'
  | 'dog_not_detected'
  | 'image_too_dark'
  | 'image_too_bright'
  | 'invalid_image'
  | 'low_contrast'
  | 'low_detail'
  | 'subject_off_center'
  | 'subject_too_large'
  | 'subject_too_small'
  | 'subject_shape_off'
  | 'visual_balance_off'
  | 'wrong_orientation';

export type QualityIssue = {
  code: QualityIssueCode;
  severity: QualityIssueSeverity;
  message: string;
};

export type QualityGateResult = {
  status: QualityGateStatus;
  score: number;
  label: string;
  summary: string;
  issues: QualityIssue[];
  detectedDog?: {
    confidence: number;
    box: DogDetectionBox;
    source: 'mediapipe';
  };
  dimensions?: {
    width: number;
    height: number;
  };
};

type WebImageMetrics = {
  brightness: number;
  contrast: number;
  detail: number;
  energyCenterX: number;
  energyCenterY: number;
  centerEnergyShare: number;
};

type LoadedImageAsset = {
  width: number;
  height: number;
  webImage?: HTMLImageElement;
  metrics?: WebImageMetrics;
};

const MILD_WARNING_CODES: QualityIssueCode[] = [
  'bad_aspect_ratio',
  'subject_off_center',
  'subject_shape_off',
  'subject_too_large',
  'subject_too_small',
  'visual_balance_off',
  'wrong_orientation',
];

const QUALITY_META: Record<
  QualityGateStatus,
  {
    label: string;
    summary: string;
  }
> = {
  pass: {
    label: 'Capture approved',
    summary: 'This photo passes the current capture checks.',
  },
  warn: {
    label: 'Accepted with warning',
    summary: 'This photo is usable, but the capture could be improved.',
  },
  block: {
    label: 'Retake needed',
    summary: 'This photo should be retaken before analysis.',
  },
};

const getNativeDimensions = (uri: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error),
    );
  });

const loadWebImage = (uri: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Web image APIs are unavailable.'));
      return;
    }

    const image = new window.Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image failed to load.'));
    image.src = uri;
  });

const getWebImageMetrics = (image: HTMLImageElement): WebImageMetrics | undefined => {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const maxDimension = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height, 1);
  const scale = Math.min(96 / maxDimension, 1);
  const width = Math.max(32, Math.round((image.naturalWidth || image.width) * scale));
  const height = Math.max(32, Math.round((image.naturalHeight || image.height) * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    return undefined;
  }

  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height).data;
  const luminance = new Float32Array(width * height);

  let brightnessSum = 0;

  for (let index = 0; index < luminance.length; index += 1) {
    const channelIndex = index * 4;
    const value =
      imageData[channelIndex] * 0.299 +
      imageData[channelIndex + 1] * 0.587 +
      imageData[channelIndex + 2] * 0.114;

    luminance[index] = value;
    brightnessSum += value;
  }

  const brightness = brightnessSum / Math.max(luminance.length, 1);
  let contrastSum = 0;
  let edgeEnergyTotal = 0;
  let edgeCenterWeightedX = 0;
  let edgeCenterWeightedY = 0;
  let centerEnergy = 0;
  let comparisons = 0;

  const centerLeft = width * 0.2;
  const centerRight = width * 0.8;
  const centerTop = height * 0.2;
  const centerBottom = height * 0.8;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const value = luminance[index];
      contrastSum += (value - brightness) ** 2;

      if (x < width - 1 && y < height - 1) {
        const right = luminance[index + 1];
        const below = luminance[index + width];
        const energy = Math.abs(value - right) + Math.abs(value - below);

        edgeEnergyTotal += energy;
        edgeCenterWeightedX += energy * x;
        edgeCenterWeightedY += energy * y;
        comparisons += 2;

        if (x >= centerLeft && x <= centerRight && y >= centerTop && y <= centerBottom) {
          centerEnergy += energy;
        }
      }
    }
  }

  const contrast = Math.sqrt(contrastSum / Math.max(luminance.length, 1));
  const detail = edgeEnergyTotal / Math.max(comparisons, 1);
  const energyCenterX = edgeEnergyTotal > 0 ? edgeCenterWeightedX / edgeEnergyTotal / Math.max(width - 1, 1) : 0.5;
  const energyCenterY = edgeEnergyTotal > 0 ? edgeCenterWeightedY / edgeEnergyTotal / Math.max(height - 1, 1) : 0.5;
  const centerEnergyShare = edgeEnergyTotal > 0 ? centerEnergy / edgeEnergyTotal : 1;

  return {
    brightness,
    contrast,
    detail,
    energyCenterX,
    energyCenterY,
    centerEnergyShare,
  };
};

const getImageAsset = async (uri: string): Promise<LoadedImageAsset> => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const webImage = await loadWebImage(uri);
    const width = webImage.naturalWidth || webImage.width;
    const height = webImage.naturalHeight || webImage.height;

    return {
      width,
      height,
      webImage,
      metrics: getWebImageMetrics(webImage),
    };
  }

  return getNativeDimensions(uri);
};

const buildResult = (
  status: QualityGateStatus,
  score: number,
  issues: QualityIssue[],
  detectedDog?: QualityGateResult['detectedDog'],
  dimensions?: { width: number; height: number },
): QualityGateResult => {
  const qualityMeta = QUALITY_META[status];
  const visibleIssues = status === 'pass' ? [] : issues;

  return {
    status,
    score: Math.max(0, Math.min(100, Math.round(score))),
    label: qualityMeta.label,
    summary: visibleIssues[0]?.message || qualityMeta.summary,
    issues: visibleIssues,
    detectedDog,
    dimensions,
  };
};

const getStatusFromIssues = (score: number, issues: QualityIssue[]): QualityGateStatus => {
  if (issues.some((issue) => issue.severity === 'block') || score < 45) {
    return 'block';
  }

  if (issues.length === 0) {
    return 'pass';
  }

  const majorWarningCount = issues.filter(
    (issue) => !MILD_WARNING_CODES.includes(issue.code),
  ).length;
  const mildWarningCount = issues.length - majorWarningCount;

  if (majorWarningCount === 0 && mildWarningCount === 1 && score >= 82) {
    return 'pass';
  }

  if (majorWarningCount === 0 && mildWarningCount === 2 && score >= 72) {
    return 'warn';
  }

  if (majorWarningCount > 0 || score < 88) {
    return 'warn';
  }

  return 'pass';
};

const getSoftRangeBounds = (
  preferredOrientation: 'portrait' | 'landscape' | 'square',
): [number, number] => {
  switch (preferredOrientation) {
    case 'landscape':
      return [0.9, Number.POSITIVE_INFINITY];
    case 'portrait':
      return [0, 1.1];
    case 'square':
    default:
      return [0.72, 1.4];
  }
};

const getCenteringMessage = (analysisType: AnalysisType) => {
  switch (analysisType) {
    case 'mood_analysis':
      return "Center the dog's face more evenly in the guide.";
    case 'coat_and_body_condition':
      return 'Keep the torso and coat texture nearer the middle of the frame.';
    case 'teeth_and_gums':
      return 'Keep the teeth and gumline centered in the frame.';
    case 'poop_analysis':
      return 'Keep the full sample closer to the center of the square.';
    case 'body_weight':
      return "Center the dog's body more evenly inside the guide.";
  }
};

const getTooDarkMessage = (analysisType: AnalysisType) => {
  switch (analysisType) {
    case 'mood_analysis':
      return 'Add more light so the face is clearly visible.';
    case 'coat_and_body_condition':
      return 'Use brighter, even light so the coat texture is visible.';
    case 'teeth_and_gums':
      return 'Brighten the mouth area so the gums and teeth read clearly.';
    case 'poop_analysis':
      return 'Use brighter light so the stool shape stands out from the ground.';
    case 'body_weight':
      return 'Use brighter light so the body outline is easy to judge.';
  }
};

const getTooBrightMessage = (analysisType: AnalysisType) => {
  switch (analysisType) {
    case 'mood_analysis':
      return 'Reduce glare so the face details are not washed out.';
    case 'coat_and_body_condition':
      return 'Avoid harsh glare so the coat texture does not get washed out.';
    case 'teeth_and_gums':
      return 'Reduce glare on the teeth so the gums stay visible.';
    case 'poop_analysis':
      return 'Reduce bright glare so the sample shape stays readable.';
    case 'body_weight':
      return 'Avoid strong backlight so the body outline stays clear.';
  }
};

const getLowContrastMessage = (analysisType: AnalysisType) => {
  switch (analysisType) {
    case 'mood_analysis':
      return 'Face details look flat. Avoid strong backlight and increase contrast.';
    case 'coat_and_body_condition':
      return 'Coat texture blends into the background. Use clearer contrast.';
    case 'teeth_and_gums':
      return 'The gumline and teeth are not separating clearly enough.';
    case 'poop_analysis':
      return 'The sample does not stand out clearly from the ground.';
    case 'body_weight':
      return 'The body outline is not separating clearly from the background.';
  }
};

const getLowDetailMessage = (analysisType: AnalysisType) => {
  switch (analysisType) {
    case 'mood_analysis':
      return 'The face looks soft. Hold steady before capturing.';
    case 'coat_and_body_condition':
      return 'The coat detail looks soft. Hold still and refocus.';
    case 'teeth_and_gums':
      return 'The teeth and gums look blurry. Move closer and refocus.';
    case 'poop_analysis':
      return 'The sample looks soft or blurry. Hold the camera steady above it.';
    case 'body_weight':
      return 'The body outline looks soft. Step back slightly and refocus.';
  }
};

const getBalanceMessage = (analysisType: AnalysisType) => {
  switch (analysisType) {
    case 'mood_analysis':
      return 'Keep the face filling more of the center of the frame.';
    case 'coat_and_body_condition':
      return 'Keep the body and coat detail more concentrated in the center of the frame.';
    case 'teeth_and_gums':
      return 'Move closer so the teeth and gumline fill the center of the frame.';
    case 'poop_analysis':
      return 'Capture the sample more directly from above so it sits centrally.';
    case 'body_weight':
      return 'Frame the full dog more centrally so the body outline fills the guide.';
  }
};

const getOrientationMessage = (analysisType: AnalysisType) => {
  switch (analysisType) {
    case 'mood_analysis':
      return 'Use a tighter, more square face crop rather than a wide shot.';
    case 'coat_and_body_condition':
      return 'Use a wider side-body frame so the torso reads clearly.';
    case 'teeth_and_gums':
      return 'Try a tighter, more centered crop around the mouth area.';
    case 'poop_analysis':
      return 'Take the poop scan from above with a straighter square crop.';
    case 'body_weight':
      return 'Use a side-on landscape frame so the full body fits naturally.';
  }
};

const getDogMissingMessage = (analysisType: AnalysisType) => {
  if (analysisType === 'body_weight') {
    return 'A dog was not detected clearly enough in this fit scan. Step back until the full body is visible.';
  }

  return 'A dog was not detected clearly enough in this face scan. Retake with the face filling the guide.';
};

const getSubjectTooSmallMessage = (analysisType: AnalysisType) => {
  if (analysisType === 'body_weight') {
    return 'Step back only enough to keep the full dog visible from nose to tail.';
  }

  return "Move closer so the dog's face fills more of the guide.";
};

const getSubjectTooLargeMessage = (analysisType: AnalysisType) => {
  if (analysisType === 'body_weight') {
    return 'Move back a little so the full body fits comfortably inside the frame.';
  }

  return 'Move back slightly so the whole face fits inside the guide.';
};

const getSubjectShapeMessage = (analysisType: AnalysisType) => {
  if (analysisType === 'body_weight') {
    return 'Turn the dog sideways so the fit scan reads as a side profile.';
  }

  return 'Keep the face straight-on so the head shape matches the guide better.';
};

export async function validateScanImageLocally(
  analysisType: AnalysisType,
  uri: string,
): Promise<QualityGateResult> {
  const guide = SCAN_GUIDE_BY_KEY[analysisType];
  const issues: QualityIssue[] = [];
  let detectedDog: QualityGateResult['detectedDog'];
  let score = 100;

  const addIssue = (
    code: QualityIssueCode,
    severity: QualityIssueSeverity,
    message: string,
    penalty: number,
  ) => {
    const existingIssue = issues.find((issue) => issue.code === code && issue.message === message);

    if (existingIssue) {
      if (severity === 'block' && existingIssue.severity !== 'block') {
        existingIssue.severity = 'block';
      }
      return;
    }

    issues.push({ code, severity, message });
    score -= penalty;
  };

  try {
    const asset = await getImageAsset(uri);
    const ratio = asset.width / Math.max(asset.height, 1);

    if (ratio < guide.aspectRatioRange[0] || ratio > guide.aspectRatioRange[1]) {
      addIssue(
        'bad_aspect_ratio',
        'warn',
        'Framing looks off for this scan type. Try matching the guide more closely.',
        16,
      );
    }

    const [orientationMin, orientationMax] = getSoftRangeBounds(
      guide.validation.preferredOrientation,
    );

    if (ratio < orientationMin || ratio > orientationMax) {
      addIssue('wrong_orientation', 'warn', getOrientationMessage(analysisType), 10);
    }

    const metrics = asset.metrics;

    if (metrics) {
      if (metrics.brightness < guide.validation.brightnessRange[0] - 16) {
        addIssue('image_too_dark', 'warn', getTooDarkMessage(analysisType), 12);
      }

      if (metrics.brightness > guide.validation.brightnessRange[1] + 16) {
        addIssue('image_too_bright', 'warn', getTooBrightMessage(analysisType), 12);
      }

      if (metrics.contrast < guide.validation.minContrast - 5) {
        addIssue('low_contrast', 'warn', getLowContrastMessage(analysisType), 12);
      }

      if (metrics.detail < guide.validation.minDetail - 0.45) {
        addIssue('low_detail', 'warn', getLowDetailMessage(analysisType), 12);
      }

      if (metrics.centerEnergyShare < guide.validation.minCenterEnergyShare - 0.09) {
        addIssue('visual_balance_off', 'warn', getBalanceMessage(analysisType), 10);
      }

      if (
        Math.abs(metrics.energyCenterX - 0.5) > guide.validation.energyCenterTolerance.x + 0.08 ||
        Math.abs(metrics.energyCenterY - 0.5) > guide.validation.energyCenterTolerance.y + 0.08
      ) {
        addIssue('subject_off_center', 'warn', getCenteringMessage(analysisType), 10);
      }
    }

    if (guide.validation.useDogDetector && asset.webImage) {
      const dogDetection = await detectDogInWebImage(asset.webImage);

      if (dogDetection === null) {
        addIssue('dog_not_detected', 'block', getDogMissingMessage(analysisType), 70);
      } else if (dogDetection) {
        detectedDog = {
          confidence: dogDetection.confidence,
          box: dogDetection.box,
          source: 'mediapipe',
        };

        const { box } = dogDetection;
        const hardCoverageRange = guide.validation.subjectCoverageRange;
        const idealCoverageRange = guide.validation.idealSubjectCoverageRange;
        const subjectCenterTolerance = guide.validation.subjectCenterTolerance;
        const subjectAspectRatioRange = guide.validation.subjectAspectRatioRange;

        if (hardCoverageRange) {
          if (box.coverage < hardCoverageRange[0]) {
            addIssue('subject_too_small', 'block', getSubjectTooSmallMessage(analysisType), 40);
          } else if (
            idealCoverageRange &&
            box.coverage < idealCoverageRange[0] - 0.05
          ) {
            addIssue('subject_too_small', 'warn', getSubjectTooSmallMessage(analysisType), 14);
          }

          if (box.coverage > hardCoverageRange[1]) {
            addIssue('subject_too_large', 'block', getSubjectTooLargeMessage(analysisType), 40);
          } else if (
            idealCoverageRange &&
            box.coverage > idealCoverageRange[1] + 0.05
          ) {
            addIssue('subject_too_large', 'warn', getSubjectTooLargeMessage(analysisType), 14);
          }
        } else if (idealCoverageRange) {
          if (box.coverage < idealCoverageRange[0] - 0.05) {
            addIssue('subject_too_small', 'warn', getSubjectTooSmallMessage(analysisType), 14);
          } else if (box.coverage > idealCoverageRange[1] + 0.05) {
            addIssue('subject_too_large', 'warn', getSubjectTooLargeMessage(analysisType), 14);
          }
        }

        if (
          subjectCenterTolerance &&
          (Math.abs(box.centerX - 0.5) > subjectCenterTolerance.x + 0.06 ||
            Math.abs(box.centerY - 0.5) > subjectCenterTolerance.y + 0.06)
        ) {
          const xOffset = Math.abs(box.centerX - 0.5);
          const yOffset = Math.abs(box.centerY - 0.5);
          const severe =
            xOffset > subjectCenterTolerance.x * 1.9 || yOffset > subjectCenterTolerance.y * 1.9;

          addIssue(
            'subject_off_center',
            severe ? 'block' : 'warn',
            getCenteringMessage(analysisType),
            severe ? 34 : 14,
          );
        }

        if (
          subjectAspectRatioRange &&
          (box.aspectRatio < subjectAspectRatioRange[0] - 0.2 ||
            box.aspectRatio > subjectAspectRatioRange[1] + 0.2)
        ) {
          addIssue('subject_shape_off', 'warn', getSubjectShapeMessage(analysisType), 12);
        }
      }
    }

    const status = getStatusFromIssues(score, issues);

    return buildResult(status, score, issues, detectedDog, {
      width: asset.width,
      height: asset.height,
    });
  } catch {
    return buildResult('block', 0, [
      {
        code: 'invalid_image',
        severity: 'block',
        message: 'This image could not be read. Please retake or choose another photo.',
      },
    ]);
  }
}
