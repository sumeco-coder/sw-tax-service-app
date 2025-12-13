// next.config.js (CommonJS)

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    outputFileTracingIncludes: {
      "/*": ["./certs/*.pem"],
    },
  },
};

module.exports = nextConfig;
