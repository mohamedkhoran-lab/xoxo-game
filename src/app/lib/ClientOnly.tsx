"use client";

import { useIsClient } from "./useStored";

/** Renders children only in the browser (for pages that generate random puzzles on load). */
export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const isClient = useIsClient();
  if (!isClient) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontSize: "3rem" }}>⏳</div>
    );
  }
  return <>{children}</>;
}
