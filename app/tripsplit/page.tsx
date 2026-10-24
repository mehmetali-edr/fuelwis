"use client";

import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, Contract, formatEther } from "ethers";

const CHAIN_ID = BigInt(10143);
const ABI = [
  "function participantLimit() view returns (uint256)",
  "function participantCount() view returns (uint256)",
  "function shareWei() view returns (uint256)",
  "function collected() view returns (uint256)",
  "function deadline() view returns (uint256)",
  "function cancelled() view returns (bool)",
  "function paid() view returns (bool)",
  "function organizer() view returns (address)",
  "function demoStation() view returns (address)",
  "function deposits(address) view returns (uint256)",
  "function contribute() payable",
  "function refund()",
  "function cancelTrip()",
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
  myDeposit: bigint;
};

function getInjectedProvider() {
  const browserWindow = window as Window & {
    ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
  };
  if (!browserWindow.ethereum) throw new Error("MetaMask bulunamadı. Tarayıcı eklentisini aç.");
  return new BrowserProvider(browserWindow.ethereum);
}

function displayError(error: unknown) {
  if (error && typeof error === "object") {
    const candidate = error as { shortMessage?: string; reason?: string; message?: string };
    return candidate.shortMessage || candidate.reason || candidate.message || "İşlem gerçekleştirilemedi.";
  }
  return "İşlem gerçekleştirilemedi.";
}

export default function TripSplitPage() {
  const [addressInput, setAddressInput] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [wallet, setWallet] = useState("");
  const [pool, setPool] = useState<Pool | null>(null);
  const [status, setStatus] = useState("Önce Remix'ten TripSplit sözleşme adresini gir.");
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    try {
      setBusy(true);
      const provider = getInjectedProvider();
      await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      if (network.chainId !== CHAIN_ID) {
        setStatus("MetaMask'ta Monad Testnet (Chain ID 10143) ağını seç, ardından yeniden bağlan.");
        return;
      }
      const signer = await provider.getSigner();
      setWallet(await signer.getAddress());
      setStatus("MetaMask bağlandı. Şimdi sözleşme adresini yükle.");
    } catch (error) {
      setStatus(displayError(error));
    } finally {
      setBusy(false);
    }
  };

  const refresh = useCallback(async (address: string, user: string) => {
    const provider = getInjectedProvider();
    const network = await provider.getNetwork();
    if (network.chainId !== CHAIN_ID) throw new Error("Monad Testnet (10143) ağına geçmelisin.");
    const contract = new Contract(address, ABI, provider);
    const [limit, count, share, collected, deadline, cancelled, paid, organizer, station, myDeposit] = await Promise.all([
      contract.participantLimit(),
      contract.participantCount(),
      contract.shareWei(),
      contract.collected(),
      contract.deadline(),
      contract.cancelled(),
      contract.paid(),
      contract.organizer(),
      contract.demoStation(),
      contract.deposits(user),
    ]);
    setPool({ limit, count, share, collected, deadline, cancelled, paid, organizer, station, myDeposit });
  }, []);

  const load = async () => {
    const trimmed = addressInput.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      setStatus("Geçerli bir 0x... sözleşme adresi gir (42 karakter).");
      return;
    }
    if (!wallet) {
      setStatus("Önce MetaMask bağla.");
      return;
    }
    setBusy(true);
    try {
      await refresh(trimmed, wallet);
      setContractAddress(trimmed);
      setStatus("TripSplit sözleşmesi yüklendi!");
    } catch (error) {
      setPool(null);
      setStatus("Sözleşme okunamadı: " + displayError(error));
    } finally {
      setBusy(false);
    }
  };

  const execute = async (method: "contribute" | "refund" | "cancelTrip" | "payStation") => {
    if (!contractAddress || !wallet || !pool) return;
    setBusy(true);
    try {
      const provider = getInjectedProvider();
      const network = await provider.getNetwork();
      if (network.chainId !== CHAIN_ID) throw new Error("Monad Testnet (10143) ağına geç.");
      const signer = await provider.getSigner();
      if ((await signer.getAddress()).toLowerCase() !== wallet.toLowerCase()) {
        throw new Error("MetaMask hesabı değişmiş. Sayfayı yenileyip tekrar bağla.");
      }
      const contract = new Contract(contractAddress, ABI, signer);
      setStatus("MetaMask işlem onayını bekliyor...");
      const tx = method === "contribute"
        ? await contract.contribute({ value: pool.share })
        : await contract[method]();
      setStatus("İşlem zincirde onaylanıyor...");
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error("İşlem başarısız oldu.");
      await refresh(contractAddress, wallet);
      setStatus("İşlem başarılı! Havuz bilgileri güncellendi.");
    } catch (error) {
      setStatus("İşlem tamamlanamadı: " + displayError(error));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    // Wallet/account changes should never leave the old user's state onscreen.
    const injected = (window as Window & { ethereum?: {
      on?: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
    } }).ethereum;
    if (!injected?.on) return;
    const changed = () => {
      setWallet("");
      setPool(null);
      setContractAddress("");
      setStatus("MetaMask hesabı veya ağı değişti. Tekrar bağlan.");
    };
    injected.on("accountsChanged", changed);
    injected.on("chainChanged", changed);
    return () => {
      injected.removeListener?.("accountsChanged", changed);
      injected.removeListener?.("chainChanged", changed);
    };
  }, []);

  const expired = pool ? Math.floor(Date.now() / 1000) >= Number(pool.deadline) : false;
  const full = pool ? pool.count === pool.limit : false;
  const canContribute = !!pool && !pool.paid && !pool.cancelled && !expired && !full && pool.myDeposit === BigInt(0);
  const canRefund = !!pool && !pool.paid && (pool.cancelled || expired) && pool.myDeposit > BigInt(0);
  const canCancel = !!pool && !pool.paid && !pool.cancelled && wallet.toLowerCase() === pool.organizer.toLowerCase();
  const canPay = !!pool && full && !pool.paid && !pool.cancelled && !expired;
  const money = (wei: bigint) => Number(formatEther(wei)).toLocaleString("tr-TR", { maximumFractionDigits: 6 });

  return (
    <main className="min-h-screen bg-[#071310] px-5 py-12 text-white">
      <div className="mx-auto max-w-3xl space-y-7">
        <a href="/" className="text-sm font-semibold text-emerald-300">← FuelWis ana sayfa</a>
        <div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">MONAD TESTNET · DEMO</span>
          <h1 className="mt-5 text-4xl font-black"><span className="text-emerald-400">FuelWis</span> TripSplit</h1>
          <p className="mt-3 text-slate-300">Yakıt bütçesini arkadaşlarınla test MON kullanarak paylaş. Gerçek akaryakıt satışı veya TL ödemesi yapılmaz.</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#10241f] p-6 space-y-4">
          <h2 className="text-xl font-bold">1. Cüzdan ve sözleşme</h2>
          <button type="button" disabled={busy} onClick={connect} className="rounded-xl bg-emerald-400 px-5 py-3 font-bold text-black disabled:opacity-50">
            {wallet ? "Cüzdan bağlı ✓" : "MetaMask Bağla"}
          </button>
          {wallet && <p className="break-all text-xs text-slate-300">{wallet}</p>}
          <label className="block text-sm text-slate-300" htmlFor="contract-address">TripSplit sözleşme adresi (Remix → Deployed Contracts)</label>
          <input id="contract-address" className="w-full rounded-xl border border-white/20 bg-[#081611] px-4 py-3 outline-none focus:border-emerald-400" placeholder="0x..." value={addressInput} onChange={e => setAddressInput(e.target.value)} />
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={busy || !wallet} onClick={load} className="rounded-xl border border-emerald-400/50 px-5 py-3 font-semibold text-emerald-300 disabled:opacity-50">Sözleşmeyi Yükle</button>
            <button type="button" disabled={busy || !pool} onClick={async () => {
              if (!pool) return;
              setBusy(true);
              try { await refresh(contractAddress, wallet); setStatus("Havuz bilgileri yenilendi."); }
              catch (err) { setStatus(displayError(err)); }
              finally { setBusy(false); }
            }} className="rounded-xl border border-white/20 px-5 py-3 font-semibold disabled:opacity-50">Durumu Yenile</button>
          </div>
          <p role="status" className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{status}</p>
        </div>

        {pool && <div className="rounded-3xl border border-emerald-400/25 bg-gradient-to-br from-[#183d2b] to-[#10241f] p-6 space-y-5">
          <h2 className="text-xl font-bold">2. Ortak yakıt havuzu</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-400">Katılımcı</p><p className="text-2xl font-bold">{pool.count.toString()} / {pool.limit.toString()}</p></div>
            <div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-400">Kişi başı</p><p className="text-xl font-bold text-emerald-300">{money(pool.share)} MON</p></div>
            <div className="rounded-xl bg-white/5 p-4"><p className="text-xs text-slate-400">Toplanan</p><p className="text-xl font-bold">{money(pool.collected)} MON</p></div>
          </div>
          <div className="space-y-1 text-sm text-slate-300">
            <p>Benim katkım: <b>{money(pool.myDeposit)} test MON</b></p>
            <p>Son tarih: <b>{new Date(Number(pool.deadline) * 1000).toLocaleString("tr-TR")}</b></p>
            <p>Durum: <b>{pool.paid ? "Demo istasyonuna ödendi" : pool.cancelled ? "İptal edildi" : expired ? "Süresi doldu" : full ? "Hedef tamamlandı" : "Katılımcı bekleniyor"}</b></p>
          </div>
          <button type="button" disabled={busy || !canContribute} onClick={() => execute("contribute")} className="w-full rounded-xl bg-emerald-400 px-5 py-4 font-extrabold text-[#071310] disabled:cursor-not-allowed disabled:opacity-50">
            {pool.myDeposit > BigInt(0) ? "Payını zaten yatırdın ✓" : `Payımı Öde · ${money(pool.share)} test MON`}
          </button>
          <div className="grid gap-3 sm:grid-cols-2">
            {canRefund && <button type="button" disabled={busy} onClick={() => execute("refund")} className="rounded-xl border border-amber-400/40 px-4 py-3 text-amber-200">Katkımı İade Al</button>}
            {canCancel && <button type="button" disabled={busy} onClick={() => execute("cancelTrip")} className="rounded-xl border border-red-400/40 px-4 py-3 text-red-200">Yolculuğu İptal Et (Organizatör)</button>}
            {canPay && <button type="button" disabled={busy} onClick={() => execute("payStation")} className="rounded-xl border border-emerald-400/40 px-4 py-3 text-emerald-200">Demo İstasyona Aktar</button>}
          </div>
          <p className="break-all text-xs text-slate-400">Demo istasyon adresi: {pool.station}</p>
          <p className="text-xs leading-6 text-slate-400">Not: Her katılımcı kendi MetaMask hesabıyla ödeme yapar. Başka birinin yerine ödeme yapılamaz. Son tarihten sonra veya havuz tamamlandığında yeni katkı alınmaz. İstasyon ödemesi sonrası iade mümkün değildir. Bu sözleşme güvenlik denetiminden geçmemiştir.</p>
        </div>}
      </div>
    </main>
  );
}
