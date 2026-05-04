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
      },
      {
        protocol : "https",
        hostname : "i.ytimg.com",
      }
    ],
  },
  reactCompiler: true,
  reactStrictMode: false, // default
};

export default nextConfig;
