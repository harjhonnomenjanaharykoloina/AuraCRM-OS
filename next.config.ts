import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to succeed even if
    // your project has type errors.
    // !! WARN !!
    //ignoreBuildErrors: true,
  },
  serverExternalPackages: ["pg"],
  /* config options here */
};

export default nextConfig;
