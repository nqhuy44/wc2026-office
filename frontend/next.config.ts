import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        // Prevent search engines and crawlers from indexing
        { key: "X-Robots-Tag", value: "noindex, nofollow, nosnippet, noarchive" },
        // Prevent the page from being embedded in iframes on external sites
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        // Prevent MIME type sniffing
        { key: "X-Content-Type-Options", value: "nosniff" },
        // Don't send referrer to external sites
        { key: "Referrer-Policy", value: "no-referrer" },
      ],
    },
  ],
};

export default nextConfig;
