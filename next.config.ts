import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["certs/global-bundle.pem"],
  },
};

export default nextConfig;
