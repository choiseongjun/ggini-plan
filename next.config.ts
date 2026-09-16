import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["tesseract.js"],
  outputFileTracingIncludes: {
    "/api/admin/ocr": ["./assets/ocr/**/*"],
  },
};

export default nextConfig;
