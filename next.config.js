// next.config.js (CommonJS)

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/*": ["certs/global-bundle.pem"],
  },
};

module.exports = nextConfig;
