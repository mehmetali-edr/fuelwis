"use client";

import dynamic from "next/dynamic";

const RoutePlanner = dynamic(() => import("../RoutePlanner"), { ssr: false });

export default function RotaPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#061b19" }}>
      <RoutePlanner />
    </main>
  );
}
