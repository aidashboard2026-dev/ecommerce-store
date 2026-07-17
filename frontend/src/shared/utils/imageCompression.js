import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file client-side before upload.
 * Converts to WebP format if possible and applies target constraints.
 * Falls back to the original file on error.
 * 
 * @param {File} file - The original image file.
 * @returns {Promise<File>} The compressed WebP File (or original File on failure).
 */
export async function compressImage(file) {
  if (!file) return file;

  // Recommended settings
  const options = {
    maxSizeMB: 0.4,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: 'image/webp',
  };

  try {
    const compressedBlob = await imageCompression(file, options);

    // Ensure we return a File object with the proper .webp extension
    let fileName = file.name || 'image.webp';
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      fileName = fileName.substring(0, lastDotIndex) + '.webp';
    } else {
      fileName = fileName + '.webp';
    }

    return new File([compressedBlob], fileName, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Image compression failed, falling back to original file:', error);
    return file;
  }
}