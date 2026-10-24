"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

type Point = { lat: number; lng: number };

export default function FuelWisMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layersRef = useRef<Leaflet.Layer[]>([]);
  const pointsRef = useRef<Point[]>([]);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const [start, setStart] = useState<Point | null>(null);
  const [end, setEnd] = useState<Point | null>(null);
  const [message, setMessage] = useState("Başlangıç noktası için haritaya tıkla.");

  useEffect(() => {
    let disposed = false;
    let localMap: Leaflet.Map | null = null;

    async function setup() {
      const L = await import("leaflet");
      if (disposed || !containerRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([39.9334, 32.8597], 12);
      localMap = map;
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      map.on("click", (event: Leaflet.LeafletMouseEvent) => {
        const point = { lat: event.latlng.lat, lng: event.latlng.lng };
        if (pointsRef.current.length >= 2) {
          pointsRef.current = [];
          layersRef.current.forEach((layer) => map.removeLayer(layer));
          layersRef.current = [];
          setEnd(null);
        }
        pointsRef.current.push(point);
        const isStart = pointsRef.current.length === 1;
        const marker = L.circleMarker([point.lat, point.lng], {
          radius: 9,
          color: isStart ? "#16a34a" : "#eab308",
          fillColor: isStart ? "#22c55e" : "#facc15",
          fillOpacity: 1,
          weight: 3,
        }).addTo(map).bindPopup(isStart ? "Başlangıç" : "Varış");
        layersRef.current.push(marker);
        if (isStart) {
          setStart(point);
          setEnd(null);
          setMessage("Şimdi varış noktası için haritaya tıkla.");
        } else {
          setEnd(point);
          // Henüz yol rotası hesaplanmıyor. Çizilen çizgi sadece iki seçimi gösterir.
          const line = L.polyline([[pointsRef.current[0].lat, pointsRef.current[0].lng], [point.lat, point.lng]], {
            color: "#22c55e", weight: 3, dashArray: "7 8",
          }).addTo(map);
          layersRef.current.push(line);
          setMessage("İki nokta seçildi! Kesikli çizgi yol güzergâhı değildir.");
        }
      });
    }

    void setup().catch(() => setMessage("Harita yüklenemedi. İnternet bağlantını kontrol et."));
    return () => {
      disposed = true;
      localMap?.remove();
      mapRef.current = null;
      layersRef.current = [];
      leafletRef.current = null;
    };
  }, []);

  function reset() {
    const map = mapRef.current;
    if (map) layersRef.current.forEach((layer) => map.removeLayer(layer));
    layersRef.current = [];
    pointsRef.current = [];
    setStart(null);
    setEnd(null);
    setMessage("Yeni başlangıç belirlemek için haritaya tıkla.");
  }

  return (
    <section style={{ color: "#e2fbe9", background: "#0a1d18", border: "1px solid #18523d", borderRadius: 20, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🗺️ FuelWis Harita</h2>
          <p style={{ fontSize: 13, color: "#a4d2bf", marginTop: 5 }}>{message}</p>
        </div>
        <button onClick={reset} style={{ borderRadius: 10, padding: "9px 14px", background: "#145d3f", color: "white", cursor: "pointer" }}>Seçimi temizle</button>
      </div>
      <div ref={containerRef} style={{ height: 410, width: "100%", borderRadius: 14, overflow: "hidden", background: "#e6eee6" }} />
      <div style={{ marginTop: 12, fontSize: 13, display: "grid", gap: 5 }}>
        <div>🟢 Başlangıç: {start ? `${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}` : "Seçilmedi"}</div>
        <div>🟡 Varış: {end ? `${end.lat.toFixed(5)}, ${end.lng.toFixed(5)}` : "Seçilmedi"}</div>
        <p style={{ color: "#a4d2bf" }}>Bu ilk testte noktaları seçiyoruz. Gerçek sürüş rotası, mesafe ve maliyet hesabını sonraki aşamada bağlayacağız.</p>
      </div>
    </section>
  );
}
