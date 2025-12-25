import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.mux.com",
      },
      {
        protocol : "https",
        hostname : "p26ygsik1d.ufs.sh"
      }
    ],
  },
  reactCompiler: true,
  reactStrictMode: false, // default
};

export default nextConfig;
