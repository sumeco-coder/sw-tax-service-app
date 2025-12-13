// next.config.js (CommonJS)

cat > next.config.js <<'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/*": ["certs/global-bundle.pem"],
  },
};

module.exports = nextConfig;
EOF
