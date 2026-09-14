import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  // Parent ~/package-lock.json otherwise becomes the Turbopack workspace root
  // and compiling `/` hangs while it indexes the home directory.
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
