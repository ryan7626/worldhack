import type { NextConfig } from "next";
import withWebSpatial from "@webspatial/next-plugin";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@livekit/agents", "@livekit/agents-plugin-openai"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "cdn.marble.worldlabs.ai",
      },
    ],
  },
};

export default withWebSpatial()(nextConfig);
