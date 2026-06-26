import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
