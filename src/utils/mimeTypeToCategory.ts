export function mimeTypeToCategory(mimeType: string) {
  // Convert to lowercase for case-insensitive matching
  const type = mimeType.toLowerCase();

  // Video formats
  if (
    type.startsWith('video/') ||
    ['application/mp4', 'application/x-mpegurl', 'application/vnd.apple.mpegurl'].includes(type)
  ) {
    return 'VIDEO';
  }

  // Image formats
  if (type.startsWith('image/')) {
    return 'IMAGE';
  }

  // PDF
  if (type === 'application/pdf') {
    return 'PDF';
  }

  // Presentations
  if (
    type.includes('presentation') ||
    [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.presentation',
    ].includes(type)
  ) {
    return 'PRESENTATION';
  }

  // Documents
  if (
    type.includes('document') ||
    type.includes('text/') ||
    [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.oasis.opendocument.text',
      'application/rtf',
    ].includes(type)
  ) {
    return 'DOCUMENT';
  }

  // Default to OTHER
  return 'OTHER';
}
