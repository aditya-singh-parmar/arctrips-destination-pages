import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.3", "localhost"],
  images: {
    qualities: [75, 82, 85, 88],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/djqswlfat/**" },
      // Fallback placeholder source (placehold.net) for slots without real imagery yet.
      { protocol: "https", hostname: "placehold.net" },
    ],
  },
};

export default nextConfig;
