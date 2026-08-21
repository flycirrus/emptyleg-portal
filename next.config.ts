import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.2.123"],
  async redirects() {
    return [
      // Visitors landing on the idtravel.hypejets.com subdomain are sent
      // straight to the public ID Traveller page (50 €/person, no login).
      {
        source: "/",
        has: [{ type: "host", value: "idtravel.hypejets.com" }],
        destination: "/idtravel",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
