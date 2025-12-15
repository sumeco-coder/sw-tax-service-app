// next.config.ts
const nextConfig = {
  output: "standalone",

  // ✅ moved out of experimental in Next 16
  outputFileTracingIncludes: {
    "/*": ["./certs/*.pem"],
  },
};

export default nextConfig;
