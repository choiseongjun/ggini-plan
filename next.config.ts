import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Firebase's popup helpers on the service domain (not a redirect).
  async rewrites() {
    return [{
      source: "/__/auth/:path*",
      destination: "https://ggini-plan.firebaseapp.com/__/auth/:path*",
    }];
  },
  serverExternalPackages: ["tesseract.js"],
  transpilePackages: ["firebase-admin"],
  outputFileTracingIncludes: {
    "/api/admin/ocr": ["./assets/ocr/**/*"],
    "/api/admin/catalog/nutrition": ["./assets/ocr/**/*"],
    "/*": ["./certs/supabase-ca.crt"],
  },
};

export default nextConfig;
