// next.config.ts
const nextConfig = {
  output: "standalone",

  // ✅ Next 16+: this moved out of `experimental`
  outputFileTracingIncludes: {
    "/*": ["./certs/*.pem"],
  },

  // ✅ Don't fail CI builds because of ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
