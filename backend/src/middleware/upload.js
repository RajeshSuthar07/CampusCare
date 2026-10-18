import multer from 'multer';
import { env } from '../config/env.js';
import { uploadImageBuffer } from '../config/cloudinary.js';
import { ApiError } from '../utils/ApiError.js';

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB (Vercel request limit is ~4.5 MB)

// Memory storage only: nothing is written to the (ephemeral) filesystem.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 20 },
});

export const parseComplaintForm = upload.single('image');

/** Detect the real image type from magic bytes (the extension/mimetype can be faked). */
export function detectImageType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

/**
 * Validates the optional uploaded image and stores it in Cloudinary.
 * Sets req.imageUrl (or leaves it undefined when no image was sent).
 */
export async function handleImageUpload(req, _res, next) {
  const file = req.file;
  if (!file) return next();

  if (!env.cloudinaryConfigured) {
    throw ApiError.badRequest('Image uploads are not configured on this server. Submit without an image.');
  }
  if (!detectImageType(file.buffer)) {
    throw ApiError.badRequest('Only JPG, PNG or WebP images are allowed');
  }
  try {
    req.imageUrl = await uploadImageBuffer(file.buffer);
  } catch (err) {
    console.error('Cloudinary upload failed:', err?.message);
    throw new ApiError(502, 'Image upload failed. Please try again or submit without an image.');
  }
  next();
}
