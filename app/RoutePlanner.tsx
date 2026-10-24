"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Point = [number, number]; // [enlem, boylam]
type RouteResult = {
  distanceKm: number;
  durationMin: number;
  coordinates: [number, number][]; // ORS: [boylam, enlem]
};

const startIcon = L.divIcon({
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#10b981;border:3px solid white;box-shadow:0 0 0 2px #047857"></div>',
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
const endIcon = L.divIcon({
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#f59e0b;border:3px solid white;box-shadow:0 0 0 2px #b45309"></div>',
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function ClickPoints({ onPick }: { onPick: (p: Point) => void }) {
  useMapEvents({ click(e) { onPick([e.latlng.lat, e.latlng.lng]); } });
  return null;
}

function FocusRoute({ positions }: { positions: Point[] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) map.fitBounds(L.latLngBounds(positions), { padding: [35, 35] });
  }, [map, positions]);
  return null;
}

export default function RoutePlanner() {
  const [start, setStart] = useState<Point | null>(null);
  const [end, setEnd] = useState<Point | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const choose = (point: Point) => {
    setRoute(null);
    setError("");
    if (!start || end) {
      setStart(point);
      setEnd(null);
    } else {
      setEnd(point);
    }
  };

  useEffect(() => {
    if (!start || !end) return;
    const controller = new AbortController();
    const getRoute = async () => {
      setLoading(true);
      setError("");
      try {
        const a = `${start[1]},${start[0]}`;
        const b = `${end[1]},${end[0]}`;
        const res = await fetch(`/api/drive-route?start=${encodeURIComponent(a)}&end=${encodeURIComponent(b)}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Rota hesaplanamadı.");
        if (!Array.isArray(json.coordinates)) throw new Error("Rota verisi eksik.");
        setRoute(json as RouteResult);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Bir hata oluştu.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    getRoute();
    return () => controller.abort();
  }, [start, end]);

  const roadPositions: Point[] = route?.coordinates.map(([lng, lat]) => [lat, lng]) ?? [];

  return (
    <section style={{ maxWidth: 1000, margin: "auto", padding: 20, color: "#e2e8f0", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>FuelWis | Gerçek Rota</h1>
      <p style={{ marginBottom: 12, color: "#a7f3d0" }}>Haritaya önce başlangıç, sonra varış için tıkla. Üçüncü tıklama yeni bir rota başlatır.</p>
      <button onClick={() => { setStart(null); setEnd(null); setRoute(null); setError(""); }} style={{ background: "#047857", color: "white", border: 0, padding: "10px 16px", borderRadius: 8, marginBottom: 12, cursor: "pointer" }}>Seçimi sıfırla</button>
      <div style={{ height: 510, borderRadius: 16, overflow: "hidden", border: "1px solid #065f46" }}>
        <MapContainer center={[39.9208, 32.8541]} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickPoints onPick={choose} />
          {start && <Marker position={start} icon={startIcon} />}
          {end && <Marker position={end} icon={endIcon} />}
          {roadPositions.length > 1 && <><Polyline positions={roadPositions} pathOptions={{ color: "#059669", weight: 6 }} /><FocusRoute positions={roadPositions} /></>}
        </MapContainer>
      </div>
      <div style={{ background: "#064e3b", borderRadius: 12, padding: 16, marginTop: 16 }}>
        {loading ? "Karayolu rotası hesaplanıyor..." : error ? `Hata: ${error}` : route ? `✅ Mesafe: ${route.distanceKm} km · Tahmini süre: ${route.durationMin} dakika` : !start ? "Başlangıç noktasını seç." : !end ? "Şimdi varış noktasını seç." : "Rota hazırlanıyor..."}
      </div>
      <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 8 }}>Sürüş mesafesi ve süresi OpenRouteService tarafından hesaplanır. Canlı trafik bilgisi içermez.</p>
    </section>
  );
}
