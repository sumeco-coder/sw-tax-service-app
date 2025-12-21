// next.config.ts
const nextConfig = {
  output: "standalone",

  // ✅ Next 16+: this moved out of `experimental`
  outputFileTracingIncludes: {
    "/*": ["./certs/*.pem"],
  },

  // ✅ Prevent Next from bundling these into RSC/webpack
  // (fixes the mjml -> uglify-js ENOENT issue)
  serverExternalPackages: ["mjml", "uglify-js"],

  // ✅ Don't fail CI builds because of ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
