"use client";

import dynamic from "next/dynamic";

const FuelWisMap = dynamic(() => import("../FuelWisMap"), { ssr: false });

export default function MapTestPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#06120f", padding: "32px 16px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <p style={{ color: "#86efac", marginBottom: 12, fontWeight: 700 }}>FuelWis • Harita testi</p>
        <FuelWisMap />
      </div>
    </main>
  );
}
