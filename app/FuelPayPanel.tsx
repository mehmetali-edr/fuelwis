"use client";

import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, Contract, formatEther, isAddress } from "ethers";

const CHAIN_ID = BigInt(10143);
const EXPLORER = "https://testnet.monadvision.com";
const POOL_ABI = [
  "function participantLimit() view returns (uint256)",
  "function participantCount() view returns (uint256)",
  "function shareWei() view returns (uint256)",
  "function collected() view returns (uint256)",
  "function deadline() view returns (uint256)",
  "function cancelled() view returns (bool)",
  "function paid() view returns (bool)",
  "function organizer() view returns (address)",
  "function demoStation() view returns (address)",
  "function payStation()",
];

type Pool = {
  limit: bigint;
  count: bigint;
  share: bigint;
  collected: bigint;
  deadline: bigint;
  cancelled: boolean;
  paid: boolean;
  organizer: string;
  station: string;
};

type FuelPayPanelProps = {
  distanceKm: number;
  liters: number;
  estimatedTl: number;
  fuelType: string;
};

function walletProvider() {
  const ethereum = (
    window as Window & {
      ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
    }
  ).ethereum;
  if (!ethereum) throw new Error("MetaMask bulunamadı. Tarayıcı uzantısını aç.");
  return new BrowserProvider(ethereum);
}

function messageOf(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const e = error as { shortMessage?: string; reason?: string; message?: string };
    return e.shortMessage || e.reason || e.message || "İşlem yapılamadı.";
  }
  return "İşlem yapılamadı.";
}

function amount(value: bigint) {
  return Number(formatEther(value)).toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

function short(address: string) {
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export default function FuelPayPanel({ distanceKm, liters, estimatedTl, fuelType }: FuelPayPanelProps) {
  const [input, setInput] = useState("");
  const [loadedAddress, setLoadedAddress] = useState("");
  const [pool, setPool] = useState<Pool | null>(null);
  const [wallet, setWallet] = useState("");
  const [hash, setHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Son oluşturulan TripSplit havuzunu okuyabilirsin.");

  const load = useCallback(async (address: string) => {
    const normalized = address.trim();
    if (!isAddress(normalized)) throw new Error("Geçerli bir 0x... havuz adresi gir.");

    const provider = walletProvider();
    const chain = await provider.getNetwork();
    if (chain.chainId !== CHAIN_ID) throw new Error("MetaMask ağını Monad Testnet (10143) yap.");
    const code = await provider.getCode(normalized);
    if (code === "0x") throw new Error("Bu adreste akıllı sözleşme bulunamadı.");

    const contract = new Contract(normalized, POOL_ABI, provider);
    const [limit, count, share, collected, deadline, cancelled, paid, organizer, station] = await Promise.all([
      contract.participantLimit(),
      contract.participantCount(),
      contract.shareWei(),
      contract.collected(),
      contract.deadline(),
      contract.cancelled(),
      contract.paid(),
      contract.organizer(),
      contract.demoStation(),
    ]);

    setPool({ limit, count, share, collected, deadline, cancelled, paid, organizer, station });
    setLoadedAddress(normalized);
    setInput(normalized);
    setHash(localStorage.getItem(`fuelwis-fuelpay-receipt-${normalized.toLowerCase()}`) || "");
    setStatus("Havuzun gerçek blockchain durumu okundu.");
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const invited = params.get("pool");
    const saved = localStorage.getItem("fuelwis-last-pool");
    const address = invited || saved || "";
    if (isAddress(address)) {
      setInput(address);
      load(address).catch((e: unknown) => {
        if (active) setStatus("Havuz otomatik okunamadı: " + messageOf(e));
      });
    }
    // Daha önce bağlanan hesabı yeni izin istemeden geri yükle.
    try {
      const ethereum = (window as Window & {
        ethereum?: {
          request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
          on?: (event: string, callback: (...args: unknown[]) => void) => void;
          removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
        };
      }).ethereum;
      if (ethereum) {
        ethereum.request({ method: "eth_accounts" }).then((accounts) => {
          if (active && Array.isArray(accounts) && typeof accounts[0] === "string") {
            setWallet(accounts[0]);
          }
        }).catch(() => undefined);
      }
      const reset = () => { setWallet(""); setStatus("Cüzdan veya ağ değişti. Gerekirse yeniden bağlan."); };
      ethereum?.on?.("accountsChanged", reset);
      ethereum?.on?.("chainChanged", reset);
      return () => {
        active = false;
        ethereum?.removeListener?.("accountsChanged", reset);
        ethereum?.removeListener?.("chainChanged", reset);
      };
    } catch {
      return () => { active = false; };
    }
  }, [load]);

  const refresh = async () => {
    const address = input.trim() || localStorage.getItem("fuelwis-last-pool") || "";
    setBusy(true);
    try {
      await load(address);
    } catch (e: unknown) {
      setStatus("Havuz yüklenemedi: " + messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  const connect = async () => {
    setBusy(true);
    try {
      const provider = walletProvider();
      await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      if (network.chainId !== CHAIN_ID) throw new Error("Önce Monad Testnet (10143) ağını seç.");
      const signer = await provider.getSigner();
      setWallet(await signer.getAddress());
      setStatus("Cüzdan bağlandı. Ödeme işlemi yapılmadı.");
    } catch (e: unknown) {
      setStatus(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  const pay = async () => {
    if (!pool || !loadedAddress || !wallet) return;
    if (pool.count !== pool.limit || pool.cancelled || pool.paid || Date.now() >= Number(pool.deadline) * 1000) {
      setStatus("Ödeme için havuz dolu, aktif ve süresi dolmamış olmalı.");
      return;
    }
    if (wallet.toLowerCase() !== pool.organizer.toLowerCase()) {
      setStatus("Demo ödeme butonunu yalnızca organizatör hesabı kullanabilir.");
      return;
    }
    const ok = window.confirm(
      `${amount(pool.collected)} test MON, demo istasyonuna (${pool.station}) gönderilecek. ` +
      "Bu işlem geri alınamaz. Gerçek benzin satın alınmaz. Onaylıyor musun?"
    );
    if (!ok) return;

    setBusy(true);
    try {
      const provider = walletProvider();
      const network = await provider.getNetwork();
      if (network.chainId !== CHAIN_ID) throw new Error("Yanlış ağ: Monad Testnet'e geç.");
      const signer = await provider.getSigner();
      const connected = await signer.getAddress();
      if (connected.toLowerCase() !== wallet.toLowerCase()) {
        throw new Error("MetaMask hesabı değişmiş. Cüzdanı tekrar bağla.");
      }
      const contract = new Contract(loadedAddress, POOL_ABI, signer);
      setStatus("MetaMask onayı bekleniyor...");
      const tx = await contract.payStation();
      setStatus("Demo istasyonuna ödeme zincirde onaylanıyor...");
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error("İşlem onaylanmadı.");
      localStorage.setItem(`fuelwis-fuelpay-receipt-${loadedAddress.toLowerCase()}`, receipt.hash);
      setHash(receipt.hash);
      await load(loadedAddress);
      setStatus("Demo istasyon ödemesi blockchain üzerinde başarıyla tamamlandı!");
    } catch (e: unknown) {
      setStatus("İşlem tamamlanamadı: " + messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  const full = !!pool && pool.count === pool.limit;
  const expired = !!pool && Date.now() >= Number(pool.deadline) * 1000;
  const organizer = !!pool && wallet.toLowerCase() === pool.organizer.toLowerCase();
  const payable = !!pool && full && !expired && !pool.cancelled && !pool.paid && organizer;
  const paidHash = pool?.paid ? hash : "";
  const tl = Math.max(0, estimatedTl);

  return (
    <section id="fuelpay" className="mt-10 overflow-hidden rounded-[2rem] border border-emerald-400/30 bg-gradient-to-br from-[#123e30] via-[#0b211c] to-[#071613] text-white shadow-2xl">
      <div className="border-b border-white/10 px-6 py-7 md:px-8">
        <div className="mb-3 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold tracking-wider text-emerald-300">FUELPAY · MONAD TESTNET</div>
        <h3 className="text-3xl font-black tracking-tight">⛽ Dijital Yakıt Ödemesi</h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Yolculuğun tahmini yakıt ihtiyacını gör; ortak havuz dolunca test MON'u demo istasyonuna aktar ve blokzincir makbuzunu doğrula.</p>
      </div>

      <div className="grid gap-3 px-6 py-6 sm:grid-cols-3 md:px-8">
        <div className="rounded-2xl bg-white/5 p-4"><p className="text-xs text-slate-400">Rota</p><p className="mt-2 text-2xl font-black">{Math.max(0, distanceKm).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} km</p></div>
        <div className="rounded-2xl bg-white/5 p-4"><p className="text-xs text-slate-400">{fuelType} ihtiyacı</p><p className="mt-2 text-2xl font-black text-emerald-300">{Math.max(0, liters).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} L</p></div>
        <div className="rounded-2xl bg-white/5 p-4"><p className="text-xs text-slate-400">Tahmini TL maliyeti</p><p className="mt-2 text-2xl font-black">{tl.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}</p></div>
      </div>

      <div className="space-y-4 px-6 pb-7 md:px-8">
        <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs leading-6 text-amber-100">Bu sürüm yalnızca testnet ödeme simülasyonudur. TL fiyatı test MON'a çevrilmez; demo istasyonuna token aktarılması gerçek yakıt teslimi anlamına gelmez.</p>
        <div className="rounded-2xl border border-white/10 bg-[#0a2019] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-bold">Ortak yakıt havuzu</h4><button onClick={refresh} disabled={busy} type="button" className="rounded-xl border border-white/25 px-4 py-2 text-sm font-semibold disabled:opacity-50">Havuzu Yenile</button></div>
          <label htmlFor="fuelpay-pool" className="mt-4 block text-xs text-slate-300">TripSplit sözleşme adresi</label>
          <input id="fuelpay-pool" value={input} onChange={(e) => setInput(e.target.value)} placeholder="0x..." className="mt-2 w-full rounded-xl border border-white/20 bg-[#071613] px-4 py-3 font-mono text-sm outline-none focus:border-emerald-400" />
          {pool && (
            <div className="mt-5 space-y-3">
              <div className="flex flex-wrap justify-between gap-2 text-sm"><span>Katılımcılar: <strong>{pool.count.toString()} / {pool.limit.toString()}</strong></span><span>Toplanan: <strong className="text-emerald-300">{amount(pool.collected)} test MON</strong></span></div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${Math.min(100, Math.round(Number(pool.count) / Number(pool.limit) * 100))}%` }} /></div>
              <p className="text-xs text-slate-400">Kişi başı: {amount(pool.share)} test MON · Son tarih: {new Date(Number(pool.deadline) * 1000).toLocaleString("tr-TR")}</p>
              <p className="text-xs text-slate-400">Demo istasyonu: <span className="font-mono text-slate-200" title={pool.station}>{short(pool.station)}</span></p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy} onClick={connect} className="rounded-xl border border-emerald-400/50 px-4 py-3 text-sm font-semibold text-emerald-200 disabled:opacity-50">{wallet ? `Cüzdan: ${short(wallet)}` : "MetaMask Bağla"}</button>
          {pool && <span className="text-xs text-slate-300">{pool.paid ? "✅ Demo istasyona ödendi" : pool.cancelled ? "❌ Havuz iptal edildi" : expired ? "⌛ Havuzun süresi doldu" : full ? "✅ Hedef tamamlandı" : `⏳ ${Number(pool.limit - pool.count)} kişi daha bekleniyor`}</span>}
        </div>

        <button type="button" disabled={busy || !payable} onClick={pay} className="w-full rounded-2xl bg-emerald-400 px-5 py-4 text-base font-black text-[#062118] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-400">
          {pool?.paid ? "✅ Demo yakıt ödemesi tamamlandı" : pool?.cancelled ? "Havuz iptal edilmiş" : expired ? "Havuz süresi dolmuş" : !full ? "Havuzun dolması bekleniyor" : !wallet ? "Ödeme için MetaMask bağla" : !organizer ? "Ödeme için organizatör hesabını bağla" : `Demo İstasyona ${amount(pool?.collected ?? BigInt(0))} MON Öde →`}
        </button>
        <p role="status" aria-live="polite" className="rounded-xl bg-white/5 px-4 py-3 text-sm text-emerald-100">{status}</p>

        {pool?.paid && (
          <div className="rounded-2xl border border-emerald-400/35 bg-emerald-400/10 p-5">
            <h4 className="text-lg font-black text-emerald-300">🧾 FuelPay Demo Makbuzu</h4>
            <p className="mt-2 text-sm text-slate-200">TripSplit sözleşmesi ödeme durumunu zincirde <strong>tamamlandı</strong> olarak bildiriyor.</p>
            <p className="mt-2 text-xs text-slate-300">Aktarılan havuz tutarı: {amount(pool.collected)} test MON</p>
            {paidHash ? (
              <>
                <p className="mt-3 break-all font-mono text-xs text-white">{paidHash}</p>
                <a target="_blank" rel="noopener noreferrer" href={`${EXPLORER}/tx/${paidHash}`} className="mt-4 inline-flex rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-[#062118]">İşlemi Blockchain'de Doğrula ↗</a>
              </>
            ) : (
              <p className="mt-3 text-xs text-slate-300">Bu tarayıcıda ödeme işlem numarası kaydedilmemiş. Sözleşme adresinden zincir geçmişi incelenebilir.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
