import { Image } from 'react-native';

export const optimizeImageUrl = (url: string, width?: number, height?: number, quality?: number): string => {
  if (!url) return '';
  
  const params = new URLSearchParams();
  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  if (quality) params.append('q', quality.toString());
  
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${params.toString()}`;
};

export const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    Image.getSize(
      url,
      (width, height) => resolve({ width, height }),
      reject
    );
  });
};

export const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    Image.prefetch(url)
      .then(() => resolve())
      .catch(reject);
  });
};

export const preloadImages = async (urls: string[]): Promise<void> => {
  await Promise.all(urls.map(url => preloadImage(url)));
};
