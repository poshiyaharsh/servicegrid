import { BadRequestException } from '@nestjs/common';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'audio/mp4',
  'audio/mpeg',
]);

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateUploadMetadata(input: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): { sanitizedFileName: string } {
  if (!input.fileName || input.fileName.includes('..') || input.fileName.includes('/') || input.fileName.includes('\\')) {
    throw new BadRequestException('Invalid file name');
  }
  if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
    throw new BadRequestException(`Disallowed file MIME type: ${input.mimeType}`);
  }
  if (input.sizeBytes <= 0 || input.sizeBytes > MAX_FILE_BYTES) {
    throw new BadRequestException('File size must be between 1 byte and 10 MB');
  }

  const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return { sanitizedFileName };
}
