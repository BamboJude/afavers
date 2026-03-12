import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  BUNDESAGENTUR_API_KEY?: string;
  ADZUNA_APP_ID?: string;
  ADZUNA_APP_KEY?: string;
  CLIENT_URL: string;
  SMTP_HOST?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  REGISTER_SECRET?: string;
  ADMIN_SECRET?: string;
}

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'CLIENT_URL'
];

const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !process.env[envVar]
);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach((envVar) => console.error(`   - ${envVar}`));
  console.error('\nPlease create a .env file with the required variables.');
  console.error('See .env.example for reference.');
  process.exit(1);
}

export const env: EnvConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  BUNDESAGENTUR_API_KEY: process.env.BUNDESAGENTUR_API_KEY,
  ADZUNA_APP_ID: process.env.ADZUNA_APP_ID,
  ADZUNA_APP_KEY: process.env.ADZUNA_APP_KEY,
  CLIENT_URL: (process.env.CLIENT_URL || 'http://localhost:5173').trim(),
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  REGISTER_SECRET: process.env.REGISTER_SECRET,
  ADMIN_SECRET: process.env.ADMIN_SECRET,
};

// Log configuration (without sensitive data)
console.log('🔧 Environment:', env.NODE_ENV);
console.log('🔌 Port:', env.PORT);
console.log('🌐 Client URL:', env.CLIENT_URL);
console.log('🔑 API Keys configured:', {
  bundesagentur: !!env.BUNDESAGENTUR_API_KEY,
  adzuna: !!(env.ADZUNA_APP_ID && env.ADZUNA_APP_KEY),
});
