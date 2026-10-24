"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import FuelPayPanel from "./FuelPayPanel";


import TripSplitPanel from "./TripSplitPanel";
import { VEHICLES } from "./aracVerileri";

const IntegratedRouteMap = dynamic(() => import("./IntegratedRouteMap"), { ssr: false });


const unique = (values: string[]) => [...new Set(values)];
const money = (value: number) => value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });

export default function Home() {
  const [brand, setBrand] = useState("Toyota");
  const [model, setModel] = useState("Corolla");
  const [year, setYear] = useState("2022");
  const [engine, setEngine] = useState("1.5 Vision");
  const [km, setKm] = useState(120);
  const [price, setPrice] = useState(55);
  const [city, setCity] = useState("Ankara");
  const [automatic, setAutomatic] = useState(true);
  const [priceStatus, setPriceStatus] = useState("Fiyatlar yükleniyor...");
  const [priceDate, setPriceDate] = useState("");

  useEffect(() => {
    if (!automatic) return;
    const controller = new AbortController();
    fetch(`/api/fuel-prices?city=${encodeURIComponent(city)}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Fiyat alınamadı");
        return data;
      })
      .then((data: { prices: { benzin: number | null; motorin: number | null; lpg: number | null }; effective?: string }) => {
        const key = vehicle.fuel === "Benzin" ? "benzin" : vehicle.fuel === "Motorin" ? "motorin" : "lpg";
        const result = data.prices[key];
        if (typeof result !== "number" || !Number.isFinite(result) || result <= 0) throw new Error("Bu yakıt türünde fiyat bulunamadı");
        setPrice(result);
        setPriceDate(data.effective ?? "");
        setPriceStatus("Otomatik il referans fiyatı aktif");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setPriceStatus(error instanceof Error ? `${error.message} · Manuel fiyat kullanılabilir` : "Fiyat alınamadı");
        setPriceDate("");
      });
    return () => controller.abort();
  }, [city, brand, model, year, engine, automatic]);

  const brandVehicles = useMemo(() => VEHICLES.filter((v) => v.brand === brand), [brand]);
  const models = unique(brandVehicles.map((v) => v.model));
  const modelVehicles = brandVehicles.filter((v) => v.model === model);
  const years = unique(modelVehicles.map((v) => String(v.year)));
  const yearVehicles = modelVehicles.filter((v) => String(v.year) === year);
  const engines = unique(yearVehicles.map((v) => v.engine));
  const vehicle = yearVehicles.find((v) => v.engine === engine) ?? yearVehicles[0] ?? brandVehicles[0] ?? VEHICLES[0];
  const liters = (Math.max(0, km) * vehicle.consumption) / 100;
  const total = liters * Math.max(0, price);

  const chooseBrand = (next: string) => {
    const first = VEHICLES.find((v) => v.brand === next)!;
    setBrand(next); setModel(first.model); setYear(String(first.year)); setEngine(first.engine);
  };
  const chooseModel = (next: string) => {
    const first = VEHICLES.find((v) => v.brand === brand && v.model === next)!;
    setModel(next); setYear(String(first.year)); setEngine(first.engine);
  };
  const chooseYear = (next: string) => {
    const first = VEHICLES.find((v) => v.brand === brand && v.model === model && String(v.year) === next)!;
    setYear(next); setEngine(first.engine);
  };

  const field = "w-full rounded-2xl border border-white/10 bg-[#10241f] px-4 py-3 text-white outline-none focus:border-emerald-400";
  return (
    <main className="min-h-screen bg-[#071310] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#071310]/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <a href="#top" className="text-2xl font-black tracking-tight"><span className="text-emerald-400">Fuel</span>Wis<span className="text-emerald-400">.</span></a>
          <div className="flex items-center gap-5 text-sm text-slate-300"><a href="#aracim" className="hover:text-emerald-400">Aracım</a><a href="#rota" className="hover:text-emerald-400">Rota</a><a href="#sonuc" className="hover:text-emerald-400">Hesaplama</a><a href="#gelecek" className="hover:text-emerald-400">Yol Haritası</a></div>
        </nav>
      </header>
      <section id="top" className="relative overflow-hidden border-b border-white/5">
        <div className="pointer-events-none absolute -right-36 -top-32 h-[520px] w-[520px] rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-48 bottom-0 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-9 px-5 py-20 md:grid-cols-[1.3fr_1fr] md:items-center md:py-28">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold tracking-widest text-emerald-300">MONAD HACKATHON • 2026</div>
            <h1 className="text-5xl font-black leading-[1.07] tracking-tight sm:text-6xl">Akıllı rotalar.<br /><span className="text-emerald-400">Akıllı yakıt.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">Aracını seç, yolculuğunun yakıt ihtiyacını ve tahmini maliyetini saniyeler içinde keşfet. FuelWis ile yola daha bilinçli çık.</p>
            <a href="#aracim" className="mt-8 inline-flex rounded-2xl bg-emerald-400 px-7 py-4 font-extrabold text-[#062118] shadow-lg shadow-emerald-500/15 transition hover:bg-emerald-300">Hemen Hesapla →</a>
          </div>
          <div className="rounded-[2rem] border border-emerald-400/20 bg-gradient-to-br from-[#17382c] via-[#0c201a] to-[#091511] p-8 shadow-2xl shadow-emerald-900/20">
            <div className="text-6xl">🚘</div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Akıllı Sürüş Paneli</p>
            <h2 className="mt-2 text-3xl font-black">Yolculuğun kontrol altında.</h2>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/5 p-4"><p className="text-xs text-slate-400">Araç sayısı</p><p className="mt-1 text-2xl font-black">{VEHICLES.length}</p></div>
              <div className="rounded-2xl bg-white/5 p-4"><p className="text-xs text-slate-400">Yakıt hesabı</p><p className="mt-1 text-2xl font-black text-emerald-400">Canlı</p></div>
            </div>
            <p className="mt-5 text-xs text-slate-400">Yakıt fiyatları güncel kaynaklardan alınabilir. Araç tüketimi, seçilen versiyona göre WLTP referansı veya tahmini değer olarak etiketlenir.</p>
          </div>
        </div>
      </section>
      <section id="aracim" className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-8"><p className="text-sm font-bold uppercase tracking-widest text-emerald-400">01 / ARACIM</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Aracını tanıyalım.</h2><p className="mt-3 text-slate-400">Marka, model ve motor bilgilerini seçerek başlayabilirsin.</p></div>
        <div className="grid gap-5 rounded-[2rem] border border-white/10 bg-[#0c1c17] p-6 shadow-2xl md:grid-cols-2 md:p-9">
          <label className="grid gap-2 text-sm font-semibold text-slate-300">Marka<select className={field} value={brand} onChange={(e) => chooseBrand(e.target.value)}>{unique(VEHICLES.map((v) => v.brand)).map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-300">Model<select className={field} value={model} onChange={(e) => chooseModel(e.target.value)}>{models.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-300">Yıl<select className={field} value={year} onChange={(e) => chooseYear(e.target.value)}>{years.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-300">Motor<select className={field} value={engine} onChange={(e) => setEngine(e.target.value)}>{engines.map((item) => <option key={item}>{item}</option>)}</select></label>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 md:col-span-2"><p className="text-sm text-emerald-200">Seçilen araç</p><p className="mt-1 text-xl font-black">{vehicle.brand} {vehicle.model} • {vehicle.engine}</p><p className="mt-2 text-sm text-slate-300">{vehicle.year} · {vehicle.fuel} · Tüketim: <strong className="text-emerald-300">{vehicle.consumption.toLocaleString("tr-TR")} L/100 km</strong></p>
            <p className="mt-2 text-xs text-emerald-200">Veri türü: {vehicle.dataType}</p>
            {vehicle.sourceUrl && <a href={vehicle.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-emerald-300 underline underline-offset-4">Üretici kaynağını aç ↗</a>}
            {vehicle.sourceNote && <p className="mt-1 text-xs text-slate-300">{vehicle.sourceNote}</p>}
          </div>
        </div>
      </section>
      <section id="rota" className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-400">02 / ROTA PLANLAMA</p>
        <h2 className="mt-2 text-3xl font-black sm:text-4xl">İki nokta seç, gerçek yolu hesapla.</h2>
        <p className="mt-3 mb-7 text-slate-400">Haritaya önce başlangıç, sonra varış noktası için tıkla. Gerçek karayolu mesafesi hesaplamaya otomatik aktarılır.</p>
        <IntegratedRouteMap onDistance={setKm} />
      </section>
      <section id="sonuc" className="border-y border-white/5 bg-[#0a1914]"><div className="mx-auto max-w-6xl px-5 py-16"><p className="text-sm font-bold uppercase tracking-widest text-emerald-400">03 / HESAPLAMA</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Yolculuğun ne kadar yakar?</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2"><div className="grid gap-5 rounded-[2rem] border border-white/10 bg-[#10231b] p-6 md:p-8">
          <label className="grid gap-2 text-sm font-semibold text-slate-300">Mesafe (km)<input className={field} type="number" min="0" max="100000" value={km} onChange={(e) => setKm(Number(e.target.value) || 0)} /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-300">Yakıt fiyatı şehri
            <select className={field} value={city} onChange={(e) => { setCity(e.target.value); setPriceStatus("Fiyatlar yükleniyor..."); }}>
              {["Ankara", "İstanbul", "Bursa", "İzmir", "Antalya", "Adana", "Konya", "Eskişehir", "Kocaeli", "Samsun", "Gaziantep", "Mersin", "Kayseri", "Trabzon", "Diyarbakır"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-300"><input type="checkbox" checked={automatic} onChange={(e) => { setAutomatic(e.target.checked); setPriceStatus(e.target.checked ? "Fiyatlar yükleniyor..." : "Manuel fiyat modu"); }} /> Otomatik il fiyatını kullan</label>
          <label className="grid gap-2 text-sm font-semibold text-slate-300">{vehicle.fuel} litre fiyatı (TL)
            <input className={field} type="number" min="0" step="0.01" value={price} onChange={(e) => { setAutomatic(false); setPriceStatus("Manuel fiyat modu"); setPrice(Number(e.target.value) || 0); }} />
          </label>
          <div aria-live="polite" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">⛽ {priceStatus}{priceDate && automatic ? ` · Fiyat geçerlilik tarihi: ${priceDate}` : ""}</div>
          <p className="text-xs leading-6 text-slate-400">Kaynak: EPDK bildirimlerinden derleyen Güncel Akaryakıt Fiyatları. İl bazlı medyan referans fiyat; istasyon pompa fiyatı farklı olabilir. İstanbul için iki yakanın ortalaması kullanılır. Araç tüketimi seçilen versiyona göre kaynaklı WLTP referansı veya açıkça etiketlenmiş tahmindir. WLTP gerçek sürüş garantisi değildir.</p>
        </div><div className="grid gap-4 rounded-[2rem] border border-emerald-400/25 bg-gradient-to-br from-[#1d4833] to-[#10251b] p-6 md:p-8"><p className="text-sm font-semibold text-emerald-200">Tahmini yolculuk maliyeti</p><p className="break-all text-4xl font-black tracking-tight text-white sm:text-5xl">{money(total)}</p><div className="mt-2 border-t border-white/15 pt-5"><p className="text-sm text-slate-300">Tahmini yakıt ihtiyacı</p><p className="mt-2 text-3xl font-extrabold text-emerald-300">{liters.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} litre</p></div><p className="text-sm text-slate-300">{km.toLocaleString("tr-TR")} km × {vehicle.consumption.toLocaleString("tr-TR")} L/100 km × {money(price)}/L</p></div></div>
      </div></section>
      
<section
  id="tripsplit"
  className="mx-auto max-w-6xl px-5 py-16"
>
  <div className="rounded-[2rem] border border-emerald-400/30 bg-gradient-to-br from-[#173e30] to-[#0b211b] p-8 md:p-12">
    <p className="text-sm font-bold uppercase tracking-widest text-emerald-400">
      04 / BLOCKCHAIN
    </p>

    <h2 className="mt-3 text-3xl font-black">
      ⛓️ FuelWis TripSplit
    </h2>

    <p className="mt-4 max-w-2xl text-slate-300">
      Yolculuğun yakıt masrafını arkadaşlarınla paylaş.
      Monad Testnet üzerinde ortak ödeme havuzuna katıl,
      katkıları takip et ve ödemeleri şeffaf biçimde yönet.
    </p>

    <a
      href="/tripsplit"
      className="mt-7 inline-flex rounded-2xl bg-emerald-400 px-7 py-4 font-extrabold text-[#062118] transition hover:bg-emerald-300"
    >
      Ortak Yakıt Havuzunu Aç →
    </a>

<TripSplitPanel />

<FuelPayPanel
  distanceKm={km}
  liters={liters}
  estimatedTl={total}
  fuelType={vehicle.fuel}
/>

    <p className="mt-4 text-xs text-slate-400">
      Demo işlemleri test MON ile yapılır. Gerçek yakıt satın alınmaz.
    </p>
  </div>
</section>

      <section id="gelecek" className="mx-auto max-w-6xl px-5 py-16"><p className="text-sm font-bold uppercase tracking-widest text-emerald-400">05 / YOL HARİTASI</p><h2 className="mt-2 text-3xl font-black">Sıradaki geliştirmeler</h2><div className="mt-8 grid gap-4 md:grid-cols-3">{[{ icon: "⛽", name: "Güncel akaryakıt fiyatı", text: "İl bazlı otomatik fiyat bağlantısı aktif." }, { icon: "🗺️", name: "Gerçek yol rotası", text: "Haritadan seçilen rotanın kilometresi hesaplamaya bağlandı." }, { icon: "⛓️", name: "Monad TripSplit", text: "Testnet üzerinde ortak yakıt bütçesi havuzu." }].map((item) => <div key={item.name} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6"><div className="text-4xl">{item.icon}</div><h3 className="mt-5 text-lg font-bold">{item.name}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p><span className="mt-5 inline-block rounded-full border border-amber-300/30 px-3 py-1 text-xs text-amber-200">{"Çalışıyor"}</span></div>)}</div></section>
      <footer className="border-t border-white/10 py-7 text-center text-sm text-slate-500">© 2026 FuelWis · Monad Hackathon</footer>
    </main>
  );
}
