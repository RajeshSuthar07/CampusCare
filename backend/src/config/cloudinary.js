import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';

if (env.cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/** Upload an in-memory image buffer to Cloudinary and resolve with the secure URL. */
export function uploadImageBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'campuscare/complaints',
        resource_type: 'image',
        allowed_formats: ['jpg', 'png', 'webp'],
      },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });
}
