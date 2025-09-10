import { google } from 'googleapis';
import fs from 'fs'; // Use standard fs for createReadStream
import fsPromises from 'fs/promises'; // Use fs/promises for unlink
import config from '../config.js';
import { logToFile } from '../utils/logger.js';

// Google Drive API setup
const oauth2Client = new google.auth.OAuth2(
  config.googleClientId,
  config.googleClientSecret,
  config.googleRedirectUri
);
oauth2Client.setCredentials({ refresh_token: config.googleRefreshToken });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const response = await drive.files.create({
      requestBody: {
        name: req.file.originalname,
        mimeType: req.file.mimetype,
      },
      media: {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(filePath), // Use standard fs
      },
      fields: 'id, name',
      supportsAllDrives: true,
    });

    await fsPromises.unlink(filePath); // Use fs/promises for unlink

    await logToFile({
      filename: response.data.name,
      fileId: response.data.id,
      type: 'upload'
    });

    res.json({
      success: true,
      id: response.data.id,
      name: response.data.name
    });
  } catch (err) {
    console.error('Upload error:', err.response?.data || err.message);
    if (req.file) await fsPromises.unlink(req.file.path); // Use fs/promises for unlink
    res.status(500).json({ success: false, error: err.response?.data?.error || err.message });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const fileInfo = await drive.files.get({
      fileId,
      fields: 'name',
      supportsAllDrives: true
    });

    const response = await drive.files.delete({ 
      fileId,
      supportsAllDrives: true 
    });

    await logToFile({
      filename: fileInfo.data.name || 'Unknown',
      fileId,
      type: 'delete'
    });

    res.json({ success: true, status: response.status });
  } catch (err) {
    console.error('Delete error:', err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.response?.data?.error || err.message });
  }
};

export const shareFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const fileInfo = await drive.files.get({
      fileId,
      fields: 'name',
      supportsAllDrives: true
    });

    await drive.permissions.create({
      fileId,
      requestBody: { 
        role: 'reader', 
        type: 'anyone',
        allowFileDiscovery: true
      },
      supportsAllDrives: true,
      fields: 'id'
    });

    const result = await drive.files.get({
      fileId,
      fields: 'webViewLink, webContentLink',
      supportsAllDrives: true
    });

    await logToFile({
      filename: fileInfo.data.name || 'Unknown',
      fileId,
      url: result.data.webViewLink,
      type: 'public_URL'
    });

    res.json(result.data);
  } catch (err) {
    console.error('Share error:', err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.response?.data?.error || err.message });
  }
};

export const generateDownloadLink = async (req, res) => {
  try {
    const fileId = req.params.id;
    const fileInfo = await drive.files.get({
      fileId,
      fields: 'name',
      supportsAllDrives: true
    });

    await drive.permissions.create({
      fileId,
      requestBody: { 
        role: 'reader', 
        type: 'anyone',
        allowFileDiscovery: true
      },
      supportsAllDrives: true,
      fields: 'id'
    });

    const result = await drive.files.get({
      fileId,
      fields: 'webContentLink',
      supportsAllDrives: true
    });

    await logToFile({
      filename: fileInfo.data.name || 'Unknown',
      fileId,
      url: result.data.webContentLink,
      type: 'download_URL'
    });

    res.json({ webContentLink: result.data.webContentLink });
  } catch (err) {
    console.error('Download link error:', err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.response?.data?.error || err.message });
  }
};