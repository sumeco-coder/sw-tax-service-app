const nextConfig = {
  output: "standalone",
  experimental: {
    outputFileTracingIncludes: {
      "/*": ["./certs/*.pem"],
    },
  },
};
export default nextConfig;
