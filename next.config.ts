import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.airtableusercontent.com",
      },
    ],
  },
};

export default nextConfig;
