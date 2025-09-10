import dotenv from 'dotenv';

dotenv.config();

export default {
  port: process.env.PORT || 3001,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  environment: process.env.NODE_ENV || 'development'
};