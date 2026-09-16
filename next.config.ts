import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["tesseract.js"],
  transpilePackages: ["firebase-admin"],
  outputFileTracingIncludes: {
    "/api/admin/ocr": ["./assets/ocr/**/*"],
    "/*": ["./certs/supabase-ca.crt"],
  },
};

export default nextConfig;
