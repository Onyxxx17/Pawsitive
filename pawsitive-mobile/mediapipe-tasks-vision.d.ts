declare module '@mediapipe/tasks-vision' {
  export class FilesetResolver {
    static forVisionTasks(basePath: string): Promise<unknown>;
  }

  export class ObjectDetector {
    static createFromOptions(
      wasmFileset: unknown,
      options: {
        baseOptions: {
          modelAssetPath: string;
          delegate?: 'CPU' | 'GPU';
        };
        runningMode?: 'IMAGE' | 'VIDEO';
        categoryAllowlist?: string[];
        maxResults?: number;
        scoreThreshold?: number;
      },
    ): Promise<{
      detect(image: HTMLImageElement): {
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
    }>;
  }
}
