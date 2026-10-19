import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp é nativo e precisa rodar fora do bundle
  serverExternalPackages: ["sharp"],
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
