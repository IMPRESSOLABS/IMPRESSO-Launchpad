/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    appName: process.env.APP_NAME,
    projectId: process.env.PROJECT_ID,
    apiUrl: process.env.API_URL
  },
  output: 'export'
};

module.exports = nextConfig;
