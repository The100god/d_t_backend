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
    const files = req.files || (req.file ? [req.file] : []);
    if (files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    // Upload all files in parallel
    const uploadPromises = files.map(async (file) => {
      const uploadResult = await uploadImage(file.buffer, file.originalname);
      const media = new Media({
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        fileName: file.originalname || 'Captured Photo',
        creator: req.user.userId
      });
      return await media.save();
    });
    
    const savedMedia = await Promise.all(uploadPromises);
    
    // Return single object if only one file was uploaded, otherwise return array
    if (savedMedia.length === 1) {
      return res.status(201).json(savedMedia[0]);
    }
    res.status(201).json(savedMedia);
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

exports.deleteMediaBulk = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No media asset IDs provided' });
    }

    const mediaAssets = await Media.find({
      _id: { $in: ids },
      creator: req.user.userId
    });

    if (mediaAssets.length === 0) {
      return res.status(404).json({ error: 'No authorized media assets found' });
    }

    // Delete from Cloudinary (or local folder) in parallel
    const deletePromises = mediaAssets.map(async (media) => {
      await deleteImage(media.publicId);
      return media._id;
    });
    await Promise.all(deletePromises);

    // Delete from MongoDB
    await Media.deleteMany({
      _id: { $in: mediaAssets.map(m => m._id) }
    });

    res.json({ message: 'Media assets successfully bulk deleted', deletedCount: mediaAssets.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
