import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lzeljgbudkqpbmbbbsex.supabase.co",
        pathname: "/storage/v1/object/public/site-assets/logos/**",
      },
    ],
  },
};

export default nextConfig;
