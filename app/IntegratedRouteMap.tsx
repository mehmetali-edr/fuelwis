"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

type Point = [number, number]; // longitude, latitude

type RouteResult = { distanceKm: number; durationMin: number; coordinates: Point[] };
type Candidate = { label: string; coordinates: Point };

function MapClick({ onPick }: { onPick: (p: Point) => void }) {
  useMapEvents({ click(e) { onPick([e.latlng.lng, e.latlng.lat]); } });
  return null;
}

function ZoomToRoute({ coordinates }: { coordinates: LatLngExpression[] }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates.length > 1) map.fitBounds(coordinates as [number, number][], { padding: [25, 25] });
  }, [map, coordinates]);
  return null;
}

export default function IntegratedRouteMap({ onDistance }: { onDistance: (km: number) => void }) {
  const [start, setStart] = useState<Point | null>(null);
  const [end, setEnd] = useState<Point | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [status, setStatus] = useState("Haritaya tıkla veya aşağıya iki adres yaz.");
  const [fromText, setFromText] = useState("Kızılay, Ankara");
  const [toText, setToText] = useState("Anıtkabir, Ankara");
  const [fromOptions, setFromOptions] = useState<Candidate[]>([]);
  const [toOptions, setToOptions] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(false);

  const pick = useCallback((point: Point) => {
    if (!start || end) {
      setStart(point); setEnd(null); setRoute(null);
      setStatus("Şimdi haritada varış noktasını seç.");
    } else {
      setEnd(point);
    }
  }, [start, end]);

  const findAddresses = async () => {
    if (fromText.trim().length < 3 || toText.trim().length < 3) {
      setStatus("Başlangıç ve varış için en az üç karakter gir.");
      return;
    }
    setBusy(true);
    setFromOptions([]); setToOptions([]);
    setRoute(null); setStart(null); setEnd(null);
    setStatus("Adresler aranıyor...");
    try {
      const search = async (text: string): Promise<Candidate[]> => {
        const response = await fetch(`/api/geocode?text=${encodeURIComponent(text.trim())}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Adres aranamadı.");
        return data.results as Candidate[];
      };
      const [starts, ends] = await Promise.all([search(fromText), search(toText)]);
      if (!starts.length || !ends.length) throw new Error("Adreslerden biri bulunamadı. Şehir ve semt ekleyerek tekrar dene.");
      setFromOptions(starts); setToOptions(ends);
      setStatus("Bulunan yerleri kontrol et ve Rotayı Çiz'e bas.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Adres aranamadı.");
    } finally {
      setBusy(false);
    }
  };

  const applyAddressRoute = () => {
    if (!fromOptions.length || !toOptions.length) return;
    const a = fromOptions[Number((document.getElementById("fw-from-choice") as HTMLSelectElement)?.value ?? 0)];
    const b = toOptions[Number((document.getElementById("fw-to-choice") as HTMLSelectElement)?.value ?? 0)];
    if (!a || !b) return;
    setRoute(null);
    setStart(a.coordinates);
    setEnd(b.coordinates);
  };

  useEffect(() => {
    if (!start || !end) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ start: start.join(","), end: end.join(",") });
    setStatus("Gerçek karayolu rotası hesaplanıyor...");
    fetch(`/api/drive-route?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Rota hesaplanamadı.");
        return json as RouteResult;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!Number.isFinite(data.distanceKm) || !Array.isArray(data.coordinates)) throw new Error("Geçersiz rota sonucu.");
        setRoute(data);
        onDistance(data.distanceKm);
        setStatus("Rota hazır! Kilometre yakıt hesabına aktarıldı.");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setStatus(error instanceof Error ? error.message : "Rota hesaplanamadı.");
      });
    return () => controller.abort();
  }, [start, end, onDistance]);

  const path: LatLngExpression[] = route?.coordinates.map(([lng, lat]) => [lat, lng]) ?? [];
  const field = "w-full rounded-xl border border-white/15 bg-[#071b14] p-3 text-sm text-white outline-none focus:border-emerald-400";

  return (
    <div className="overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-[#10231b] p-4 md:p-6">
      <div className="mb-5 grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-200">📍 Başlangıç adresi
          <input className={field} value={fromText} onChange={(e) => {setFromText(e.target.value); setFromOptions([]);}} placeholder="Kızılay, Ankara" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-200">🏁 Varış adresi
          <input className={field} value={toText} onChange={(e) => {setToText(e.target.value); setToOptions([]);}} placeholder="Anıtkabir, Ankara" />
        </label>
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={findAddresses} className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-[#09251c] disabled:opacity-50">{busy ? "Aranıyor..." : "🔎 Adresleri Bul"}</button>
        <button type="button" onClick={() => {setStart(null); setEnd(null); setRoute(null); setFromOptions([]); setToOptions([]); setStatus("Haritaya tıkla veya iki adres yaz.");}} className="rounded-xl border border-white/20 px-4 py-3 text-sm hover:bg-white/10">Yeni rota seç</button>
      </div>
      {fromOptions.length > 0 && toOptions.length > 0 && (
        <div className="mb-4 grid gap-3 rounded-xl border border-emerald-500/25 bg-white/5 p-4 md:grid-cols-2">
          <label className="grid gap-2 text-xs text-slate-300">Başlangıç sonucunu kontrol et
            <select id="fw-from-choice" className={field}>{fromOptions.map((item, i) => <option key={i} value={i}>{item.label}</option>)}</select>
          </label>
          <label className="grid gap-2 text-xs text-slate-300">Varış sonucunu kontrol et
            <select id="fw-to-choice" className={field}>{toOptions.map((item, i) => <option key={i} value={i}>{item.label}</option>)}</select>
          </label>
          <button type="button" onClick={applyAddressRoute} className="rounded-xl border border-emerald-400 px-4 py-3 font-bold text-emerald-200 md:col-span-2">🚗 Rotayı Çiz</button>
        </div>
      )}
      <p className="mb-4 text-sm text-emerald-200" aria-live="polite">🗺️ {status}</p>
      <div className="overflow-hidden rounded-2xl" style={{ height: 420 }}>
        <MapContainer center={[39.9208, 32.8541]} zoom={12} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClick onPick={pick} />
          {start && <CircleMarker center={[start[1], start[0]]} radius={9} pathOptions={{ color: "#059669", fillColor: "#10b981", fillOpacity: 1 }} />}
          {end && <CircleMarker center={[end[1], end[0]]} radius={9} pathOptions={{ color: "#f59e0b", fillColor: "#fbbf24", fillOpacity: 1 }} />}
          {path.length > 1 && <><Polyline positions={path} pathOptions={{ color: "#10b981", weight: 6 }} /><ZoomToRoute coordinates={path} /></>}
        </MapContainer>
      </div>
      {route && <div className="mt-4 flex flex-wrap gap-3 text-sm"><span className="rounded-xl bg-emerald-400/15 px-4 py-3 font-bold text-emerald-200">🚗 {route.distanceKm.toLocaleString("tr-TR")} km</span><span className="rounded-xl bg-white/10 px-4 py-3">⏱️ Yaklaşık {route.durationMin} dk</span><a href="#sonuc" className="rounded-xl bg-emerald-400 px-4 py-3 font-bold text-[#09251c]">Yakıt maliyetini gör ↓</a></div>}
      <p className="mt-3 text-xs text-slate-400">Adresler en yakın bulunan konumla eşleşebilir: Rotayı çizmeden önce sonuçları kontrol et. Haritaya tıklayarak da rota belirleyebilirsin. Süre canlı trafik içermez.</p>
    </div>
  );
}
