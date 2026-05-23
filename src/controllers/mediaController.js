const Media = require('../models/Media');
const { uploadImage, deleteImage } = require('../utils/cloudinary');

exports.getAllMedia = async (req, res) => {
  try {
    const media = await Media.find({ creator: req.user.userId }).sort({ createdAt: -1 });
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    // Upload using Cloudinary stream (or local fallback)
    const uploadResult = await uploadImage(req.file.buffer, req.file.originalname);
    
    const media = new Media({
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      fileName: req.file.originalname || 'Captured Photo',
      creator: req.user.userId
    });
    
    await media.save();
    res.status(201).json(media);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteMedia = async (req, res) => {
  try {
    const media = await Media.findOne({ _id: req.params.id, creator: req.user.userId });
    if (!media) return res.status(404).json({ error: 'Media asset not found or unauthorized' });
    
    // Delete from Cloudinary (or local folder)
    await deleteImage(media.publicId);
    
    // Delete from MongoDB
    await Media.deleteOne({ _id: req.params.id });
    
    res.json({ message: 'Media asset successfully deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
