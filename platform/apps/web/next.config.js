/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["l2.devsradar.com"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
