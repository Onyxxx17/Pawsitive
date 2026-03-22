import { Ionicons } from '@expo/vector-icons';
import { ImageSourcePropType } from 'react-native';

export type AnalysisType =
  | 'mood_analysis'
  | 'coat_and_body_condition'
  | 'teeth_and_gums'
  | 'poop_analysis'
  | 'body_weight';

export type GuideOverlayType = 'face' | 'body' | 'mouth' | 'topDown';
export type PreferredOrientation = 'portrait' | 'landscape' | 'square';

export type ValidationProfile = {
  preferredOrientation: PreferredOrientation;
  brightnessRange: [number, number];
  minContrast: number;
  minDetail: number;
  minCenterEnergyShare: number;
  energyCenterTolerance: {
    x: number;
    y: number;
  };
  useDogDetector?: boolean;
  subjectCoverageRange?: [number, number];
  idealSubjectCoverageRange?: [number, number];
  subjectCenterTolerance?: {
    x: number;
    y: number;
  };
  subjectAspectRatioRange?: [number, number];
};

export type ScanGuide = {
  key: AnalysisType;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  note: string;
  accent: string;
  referenceImage: ImageSourcePropType;
  referenceText: string;
  overlay: GuideOverlayType;
  checklist: string[];
  liveHint: string;
  aspectRatioRange: [number, number];
  validation: ValidationProfile;
};

export const SCAN_GUIDES: ScanGuide[] = [
  {
    key: 'mood_analysis',
    title: 'Mood Scan',
    icon: 'happy-outline',
    note: 'Use the Doge example to match the angle before you snap the photo.',
    accent: '#FFE7BE',
    referenceImage: require('../doge_pics/doge_face.png'),
    referenceText: 'Hold the camera at eye level and keep the full face, both eyes, and the ears in frame.',
    overlay: 'face',
    checklist: ['Both eyes visible', 'Face centered', 'Good lighting'],
    liveHint: 'Keep the face inside the oval and avoid cutting off the ears.',
    aspectRatioRange: [0.8, 1.8],
    validation: {
      preferredOrientation: 'square',
      brightnessRange: [55, 238],
      minContrast: 24,
      minDetail: 3,
      minCenterEnergyShare: 0.48,
      energyCenterTolerance: { x: 0.2, y: 0.2 },
      useDogDetector: true,
      subjectCoverageRange: [0.08, 0.92],
      idealSubjectCoverageRange: [0.18, 0.72],
      subjectCenterTolerance: { x: 0.22, y: 0.22 },
      subjectAspectRatioRange: [0.55, 1.9],
    },
  },
  {
    key: 'coat_and_body_condition',
    title: 'Coat and Body',
    icon: 'sparkles-outline',
    note: 'Follow the sample pose so the coat texture and body outline are easy to review.',
    accent: '#F7D2C7',
    referenceImage: require('../doge_pics/doge_coat.png'),
    referenceText: 'Take a side or three-quarter body photo in soft light with the fur, torso, and legs clearly visible.',
    overlay: 'body',
    checklist: ['Full torso visible', 'Legs visible', 'Even lighting'],
    liveHint: 'Step back slightly until the torso and front legs fit inside the guide.',
    aspectRatioRange: [1.1, 2.2],
    validation: {
      preferredOrientation: 'landscape',
      brightnessRange: [60, 238],
      minContrast: 22,
      minDetail: 2.8,
      minCenterEnergyShare: 0.38,
      energyCenterTolerance: { x: 0.28, y: 0.24 },
    },
  },
  {
    key: 'teeth_and_gums',
    title: 'Teeth and Gums',
    icon: 'medical-outline',
    note: 'Frame the mouth like the reference so the scan can inspect the gums properly.',
    accent: '#F9E1D0',
    referenceImage: require('../doge_pics/doge_teeth.png'),
    referenceText: 'Lift the lip gently and move in close so the teeth and gumline fill most of the frame.',
    overlay: 'mouth',
    checklist: ['Teeth close-up', 'Gumline visible', 'Sharp focus'],
    liveHint: 'Move closer and keep the teeth filling most of the frame.',
    aspectRatioRange: [0.9, 1.9],
    validation: {
      preferredOrientation: 'square',
      brightnessRange: [75, 242],
      minContrast: 26,
      minDetail: 3.1,
      minCenterEnergyShare: 0.44,
      energyCenterTolerance: { x: 0.18, y: 0.18 },
    },
  },
  {
    key: 'poop_analysis',
    title: 'Poop Check',
    icon: 'leaf-outline',
    note: 'Use the Doge sample to match the top-down angle and keep the whole stool visible.',
    accent: '#E8D8BE',
    referenceImage: require('../doge_pics/doge_poo.jpg'),
    referenceText: 'Take the photo from above in clear light and include the full sample with a little ground around it.',
    overlay: 'topDown',
    checklist: ['Top-down angle', 'Full sample visible', 'Clear ground contrast'],
    liveHint: 'Hold the phone above the sample so the full shape stays inside the square.',
    aspectRatioRange: [0.8, 1.8],
    validation: {
      preferredOrientation: 'square',
      brightnessRange: [60, 240],
      minContrast: 24,
      minDetail: 2.8,
      minCenterEnergyShare: 0.42,
      energyCenterTolerance: { x: 0.2, y: 0.2 },
    },
  },
  {
    key: 'body_weight',
    title: 'Fit Scan',
    icon: 'barbell-outline',
    note: 'Match the stance in the guide so the scan can judge body shape more accurately.',
    accent: '#EADCD0',
    referenceImage: require('../doge_pics/doge_base.png'),
    referenceText: 'Stand to the side and capture the full body from nose to tail with the dog standing naturally.',
    overlay: 'body',
    checklist: ['Full body visible', 'Side profile', 'Standing naturally'],
    liveHint: 'Keep the nose, torso, and tail inside the guide before capturing.',
    aspectRatioRange: [1.2, 2.4],
    validation: {
      preferredOrientation: 'landscape',
      brightnessRange: [55, 238],
      minContrast: 22,
      minDetail: 2.8,
      minCenterEnergyShare: 0.36,
      energyCenterTolerance: { x: 0.24, y: 0.22 },
      useDogDetector: true,
      subjectCoverageRange: [0.12, 0.88],
      idealSubjectCoverageRange: [0.22, 0.72],
      subjectCenterTolerance: { x: 0.2, y: 0.22 },
      subjectAspectRatioRange: [1, 3.6],
    },
  },
];

export const SCAN_GUIDE_BY_KEY: Record<AnalysisType, ScanGuide> = SCAN_GUIDES.reduce(
  (acc, guide) => {
    acc[guide.key] = guide;
    return acc;
  },
  {} as Record<AnalysisType, ScanGuide>,
);
