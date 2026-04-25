import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Recycle in-memory compiled pages sooner in dev (fewer “stuck” old RSC trees). */
  ...(process.env.NODE_ENV === "development" && {
    onDemandEntries: {
      maxInactiveAge: 15 * 1000,
      pagesBufferLength: 2,
    },
  }),

};

export default nextConfig;
