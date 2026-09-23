/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d2xsxph8kpxj0f.cloudfront.net",
      },
    ],
  },
  async redirects() {
    return [
      // Shrink wrapping has a dedicated landing page; the generic service
      // template must never render for it.
      { source: "/services/shrink-wrapping", destination: "/shrink-wrapping", permanent: true },
      // Old storage-site paths people may type on this domain by habit.
      { source: "/winter-quote", destination: "/shrink-wrapping", permanent: true },
      { source: "/calculator", destination: "/shrink-wrapping", permanent: true },
    ];
  },
  outputFileTracingIncludes: {
    "/api/quotes/pdf/**": [
      "node_modules/pdfkit/js/data/*.afm",
    ],
  },
};

export default nextConfig;