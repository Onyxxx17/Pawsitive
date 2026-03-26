import { Platform } from 'react-native';

const DEFAULT_IMAGE_EXTENSION = 'jpeg';

const MIME_BY_EXTENSION: Record<string, string> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const normalizeImageExtension = (value?: string | null): string | null => {
  if (!value) return null;

  const normalized = value.toLowerCase().trim();
  if (normalized === 'jpg') return 'jpeg';
  if (normalized === 'jpeg' || normalized === 'png' || normalized === 'webp') return normalized;
  return null;
};

const getExtensionFromMimeType = (mimeType?: string | null): string | null => {
  if (!mimeType) return null;

  const normalized = mimeType.toLowerCase().split(';')[0].trim();
  if (normalized === 'image/jpg' || normalized === 'image/jpeg') return 'jpeg';
  if (normalized === 'image/png') return 'png';
  if (normalized === 'image/webp') return 'webp';
  return null;
};

const getExtensionFromUri = (uri: string): string | null => {
  const cleanUri = uri.split('?')[0].split('#')[0];
  if (cleanUri.startsWith('blob:')) return null;

  const fileName = cleanUri.split('/').pop() ?? '';
  if (!fileName.includes('.')) return null;

  return normalizeImageExtension(fileName.split('.').pop());
};

const getMimeTypeForExtension = (extension: string) => MIME_BY_EXTENSION[extension] ?? MIME_BY_EXTENSION[DEFAULT_IMAGE_EXTENSION];

export const isRemoteImageUri = (uri: string) => /^https?:\/\//i.test(uri);

export const createImageUploadPayload = async (uri: string, fileBaseName: string) => {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    const extension = getExtensionFromMimeType(blob.type) ?? getExtensionFromUri(uri) ?? DEFAULT_IMAGE_EXTENSION;
    const mimeType = blob.type?.startsWith('image/') ? blob.type : getMimeTypeForExtension(extension);
    const fileName = `${fileBaseName}.${extension}`;

    return {
      file: new File([blob], fileName, { type: mimeType }),
      fileName,
      mimeType,
    };
  }

  const extension = getExtensionFromUri(uri) ?? DEFAULT_IMAGE_EXTENSION;
  const mimeType = getMimeTypeForExtension(extension);
  const fileName = `${fileBaseName}.${extension}`;

  return {
    file: { uri, name: fileName, type: mimeType } as any,
    fileName,
    mimeType,
  };
};
