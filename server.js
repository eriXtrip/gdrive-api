// GDrive API/ server.js

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { google } from 'googleapis';
import fs from 'fs'; // Use standard fs for multer
import fsPromises from 'fs/promises'; // Use fs/promises for mkdir
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import { 
  uploadFile, 
  deleteFile, 
  shareFile, 
  generateDownloadLink 
} from './controllers/driveController.js';
import os from 'os';

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Setup file upload handling (limit to 10MB)
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Create uploads directory if it doesn't exist
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, 'Uploads');
fsPromises.mkdir(uploadDir, { recursive: true }).catch(err => {
  console.error('Failed to create uploads directory:', err);
});

// Google Drive API setup
const oauth2Client = new google.auth.OAuth2(
  config.googleClientId,
  config.googleClientSecret,
  config.googleRedirectUri
);
oauth2Client.setCredentials({ refresh_token: config.googleRefreshToken });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

// Routes
app.post('/api/upload', upload.single('file'), uploadFile);
app.delete('/api/delete/:id', deleteFile);
app.get('/api/share/:id', shareFile);
app.get('/api/download/:id', generateDownloadLink);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', environment: config.environment });
});

// Start server
app.listen(config.port, '0.0.0.0', () => {
  console.log(`Server running:`);
  console.log(`- Local:  http://localhost:${config.port}`);
  console.log(`- Network: http://${getLocalIp()}:${config.port}`);
});

// Get local IP address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.values(interfaces)) {
    for (const net of name) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing server...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Closing server...');
  process.exit(0);
});

export default app;