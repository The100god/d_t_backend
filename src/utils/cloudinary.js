const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const isCloudinaryConfigured = () => {
  return (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
  console.warn("WARNING: Cloudinary credentials are not configured or are set to placeholders. Falling back to local storage uploads.");
}

/**
 * Upload an image buffer to Cloudinary or save it locally as fallback.
 * @param {Buffer} buffer File buffer
 * @param {string} originalName Original file name
 * @returns {Promise<{ url: string, publicId: string }>}
 */
const uploadImage = (buffer, originalName) => {
  return new Promise((resolve, reject) => {
    if (isCloudinaryConfigured()) {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'd-t-waala',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            // console.log("error", error)
            return reject(error);
          }
          // console.log("result", result)
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      );
      uploadStream.end(buffer);
    } else {
      // Local fallback
      try {
        const uploadsDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const uniqueName = `${uuidv4()}${path.extname(originalName || '.jpg')}`;
        const filePath = path.join(uploadsDir, uniqueName);
        fs.writeFileSync(filePath, buffer);
        resolve({
          url: `/uploads/${uniqueName}`,
          publicId: `local_${uniqueName}`,
        });
      } catch (err) {
        // console.log(err);
        reject(err);
      }
    }
  });
};

/**
 * Delete an image from Cloudinary or local storage.
 * @param {string} publicId
 * @returns {Promise<any>}
 */
const deleteImage = (publicId) => {
  return new Promise((resolve, reject) => {
    if (isCloudinaryConfigured()) {
      if (publicId && publicId.startsWith('local_')) {
        // Was uploaded locally before configuration
        const localName = publicId.replace('local_', '');
        const filePath = path.join(__dirname, '../../uploads', localName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        return resolve({ result: 'ok' });
      }
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
    } else {
      // Local fallback deletion
      try {
        if (publicId) {
          const localName = publicId.replace('local_', '');
          const filePath = path.join(__dirname, '../../uploads', localName);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
        resolve({ result: 'ok' });
      } catch (err) {
        reject(err);
      }
    }
  });
};

module.exports = {
  uploadImage,
  deleteImage,
  isCloudinaryConfigured,
};
