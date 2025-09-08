const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

// Initialize log.txt with headers if it doesn't exist
const LOG_FILE = 'log.txt';
if (!fs.existsSync(LOG_FILE)) {
  const headers = 'Type'.padEnd(30) + 'Filename'.padEnd(35) + 'File ID'.padEnd(50) + 'URL\n';
  fs.writeFileSync(LOG_FILE, headers);
}

// Setup file upload handling (limit to 10MB)
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }
});

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error('Missing Google credentials in environment variables');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({ version: "v3", auth: oauth2Client });

// Log to file in tabular format
function logToFile({ filename, fileId, url = '', type }) {
  const row = `${type.padEnd(30)}${filename.padEnd(35)}${fileId.padEnd(50)}${url}\n`;
  fs.appendFileSync(LOG_FILE, row);
}

// 📌 Upload File
app.post('/upload', upload.single('file'), async (req, res) => {
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
        body: fs.createReadStream(filePath),
      },
      fields: "id, name",
      supportsAllDrives: true,
    });

    fs.unlinkSync(filePath);

    // Log upload
    logToFile({
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
    console.error("Upload error:", err.response?.data || err.message);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, error: err.response?.data?.error || err.message });
  }
});

// 📌 Delete File
app.delete('/delete/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    
    // Fetch filename before deleting
    const fileInfo = await drive.files.get({
      fileId,
      fields: 'name',
      supportsAllDrives: true
    });

    const response = await drive.files.delete({ 
      fileId,
      supportsAllDrives: true 
    });

    // Log delete
    logToFile({
      filename: fileInfo.data.name || 'Unknown',
      fileId,
      type: 'delete'
    });

    res.json({ success: true, status: response.status });
  } catch (err) {
    console.error("Delete error:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.response?.data?.error || err.message });
  }
});

// 📌 Generate Public URL
app.get('/share/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    
    // Fetch filename
    const fileInfo = await drive.files.get({
      fileId,
      fields: 'name',
      supportsAllDrives: true
    });

    await drive.permissions.create({
      fileId,
      requestBody: { 
        role: "reader", 
        type: "anyone",
        allowFileDiscovery: true
      },
      supportsAllDrives: true,
      fields: 'id'
    });

    const result = await drive.files.get({
      fileId,
      fields: "webViewLink, webContentLink",
      supportsAllDrives: true
    });

    // Log public_URL
    logToFile({
      filename: fileInfo.data.name || 'Unknown',
      fileId,
      url: result.data.webViewLink,
      type: 'public_URL'
    });

    res.json(result.data);
  } catch (err) {
    console.error("Share error:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.response?.data?.error || err.message });
  }
});

// 📌 Generate Downloadable Link
app.get('/download/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    
    // Fetch filename
    const fileInfo = await drive.files.get({
      fileId,
      fields: 'name',
      supportsAllDrives: true
    });

    // Ensure "anyone" reader permission for webContentLink
    await drive.permissions.create({
      fileId,
      requestBody: { 
        role: "reader", 
        type: "anyone",
        allowFileDiscovery: true
      },
      supportsAllDrives: true,
      fields: 'id'
    });

    const result = await drive.files.get({
      fileId,
      fields: "webContentLink",
      supportsAllDrives: true
    });

    // Log download_URL
    logToFile({
      filename: fileInfo.data.name || 'Unknown',
      fileId,
      url: result.data.webContentLink,
      type: 'download_URL'
    });

    res.json({ webContentLink: result.data.webContentLink });
  } catch (err) {
    console.error("Download link error:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.response?.data?.error || err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));