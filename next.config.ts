import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Handle canvas module for PDF.js
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
        os: false,
        stream: false,
        crypto: false,
      };
    }
    
    // Ignore canvas module warnings
    config.externals = config.externals || [];
    config.externals.push({
      canvas: 'canvas',
    });
    
    return config;
  },
  // Copy PDF.js worker to public directory
  async rewrites() {
    return [
      {
        source: '/pdf.worker.min.js',
        destination: 'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js',
      },
    ];
  },
};

export default nextConfig;

