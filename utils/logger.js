import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, '../log.txt');

export const logToFile = async ({ filename, fileId, url = '', type }) => {
  try {
    const headers = 'Type'.padEnd(30) + 'Filename'.padEnd(35) + 'File ID'.padEnd(50) + 'URL\n';
    if (!(await fs.access(LOG_FILE).then(() => true).catch(() => false))) {
      await fs.writeFile(LOG_FILE, headers);
    }
    const row = `${type.padEnd(30)}${filename.padEnd(35)}${fileId.padEnd(50)}${url}\n`;
    await fs.appendFile(LOG_FILE, row);
  } catch (err) {
    console.error('Logging error:', err.message);
  }
};