"use client";

import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, Contract, ContractFactory, formatEther, isAddress, parseEther } from "ethers";
import type { InterfaceAbi } from "ethers";
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

export default function TripSplitPanel() {
  const [addressInput, setAddressInput] = useState("");
  
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const invitedPool = params.get("pool");
  const savedPool = localStorage.getItem("fuelwis-last-pool");

  const address = invitedPool || savedPool;

  if (address && /^0x[a-fA-F0-9]{40}$/.test(address)) {
    setAddressInput(address);
  }
}, []);

  const [contractAddress, setContractAddress] = useState("");
  const [wallet, setWallet] = useState("");
  const [pool, setPool] = useState<Pool | null>(null);
  const [status, setStatus] = useState("Önce Remix'ten TripSplit sözleşme adresini gir.");
  const [busy, setBusy] = useState(false);
  const [lastTxHash, setLastTxHash] = useState("");
  const [newLimit, setNewLimit] = useState(3);
  const [newShare, setNewShare] = useState("0.001");
  const [newStation, setNewStation] = useState("");
  const [artifact, setArtifact] = useState<{ abi: unknown[]; bytecode: string } | null>(null);

useEffect(() => {
  let active = true;

  async function restoreWallet() {
    try {
      const provider = getInjectedProvider();

      // Daha önce izin verilmiş hesapları sessizce kontrol eder.
      const accounts = await provider.send("eth_accounts", []);

      if (!active || !Array.isArray(accounts) || accounts.length === 0) {
        return;
      }

      const network = await provider.getNetwork();

      if (network.chainId !== CHAIN_ID) {
        if (active) {
          setStatus("MetaMask'ta Monad Testnet ağını seç.");
        }
        return;
      }

      const account = accounts[0];

      if (typeof account === "string" && active) {
        setWallet(account);
        setStatus("MetaMask bağlantısı geri yüklendi ✓");
      }
    } catch {
      // MetaMask henüz hazır değilse kullanıcı elle bağlanabilir.
    }
  }

  restoreWallet();

  return () => {
    active = false;
  };
}, []);

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

useEffect(() => {
  if (!wallet) return;

  let active = true;

  async function restorePool() {
    const params = new URLSearchParams(window.location.search);
    const invitedPool = params.get("pool");
    const savedPool = localStorage.getItem("fuelwis-last-pool");
    const address = invitedPool || savedPool;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return;
    }

    try {
      await refresh(address, wallet);

      if (active) {
        setAddressInput(address);
        setContractAddress(address);
        setStatus("TripSplit havuzu otomatik yüklendi ✓");
      }
    } catch (error) {
      if (active) {
        setPool(null);
        setStatus("Havuz otomatik yüklenemedi: " + displayError(error));
      }
    }
  }

  restorePool();

  return () => {
    active = false;
  };
}, [wallet, refresh]);

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
      localStorage.setItem("fuelwis-last-pool", trimmed);
      setStatus("TripSplit sözleşmesi yüklendi!");
    } catch (error) {
      setPool(null);
      setStatus("Sözleşme okunamadı: " + displayError(error));
    } finally {
      setBusy(false);
    }
  };

  const readArtifact = async (file?: File) => {
    if (!file) return;
    try {
      const input: unknown = JSON.parse(await file.text());
      if (!input || typeof input !== "object") throw new Error("Dosya JSON değil.");
      const data = input as {
        abi?: unknown[];
        bytecode?: string | { object?: string };
        evm?: { bytecode?: { object?: string } };
      };
      const raw = typeof data.bytecode === "string"
        ? data.bytecode
        : data.bytecode?.object ?? data.evm?.bytecode?.object ?? "";
      const bytecode = raw.startsWith("0x") ? raw : `0x${raw}`;
      if (!Array.isArray(data.abi) || !/^0x(?:[a-fA-F0-9]{2})+$/.test(bytecode)) {
        throw new Error("Remix derleme çıktısında ABI ve bytecode bulunamadı.");
      }
      const constructor = data.abi.find((item) => {
        const entry = item as { type?: string; inputs?: unknown[] };
        return entry.type === "constructor" && entry.inputs?.length === 3;
      });
      if (!constructor) throw new Error("Bu dosya üç parametreli TripSplit sözleşmesine ait görünmüyor.");
      setArtifact({ abi: data.abi, bytecode });
      setStatus("TripSplit derleme dosyası hazır. Yeni havuz oluşturabilirsin.");
    } catch (error) {
      setArtifact(null);
      setStatus("Derleme dosyası okunamadı: " + displayError(error));
    }
  };

  const createPool = async () => {
    if (!wallet || !artifact) {
      setStatus("Önce MetaMask'ı bağla ve TripSplit derleme dosyasını seç.");
      return;
    }
    if (!Number.isInteger(newLimit) || newLimit < 2 || newLimit > 12) {
      setStatus("Katılımcı sayısı 2 ile 12 arasında olmalı.");
      return;
    }
    if (!isAddress(newStation)) {
      setStatus("Demo istasyonunun geçerli 0x adresini gir.");
      return;
    }
    let contribution: bigint;
    try {
      contribution = parseEther(newShare.trim().replace(",", "."));
      if (contribution <= BigInt(0)) throw new Error("Katkı sıfırdan büyük olmalı.");
    } catch {
      setStatus("Geçerli bir test MON tutarı gir. Örnek: 0.001");
      return;
    }
    setBusy(true);
    try {
      const provider = getInjectedProvider();
      if ((await provider.getNetwork()).chainId !== CHAIN_ID) throw new Error("Monad Testnet ağını seç.");
      const signer = await provider.getSigner();
      const currentWallet = await signer.getAddress();
      if (currentWallet.toLowerCase() !== wallet.toLowerCase()) throw new Error("Hesap değişti. Yeniden bağlan.");
      
const factory = new ContractFactory(
  artifact.abi as InterfaceAbi,
  artifact.bytecode,
  signer
);

      setStatus("MetaMask'tan yeni havuz sözleşmesi oluşturma işlemini onayla...");
      const contract = await factory.deploy(newLimit, contribution, newStation);
      setStatus("İşlem blockchain'de onaylanıyor...");
      await contract.waitForDeployment();
      const deployedAddress = await contract.getAddress();
      await refresh(deployedAddress, currentWallet);
      setAddressInput(deployedAddress);
      setContractAddress(deployedAddress);
      setStatus("Yeni havuz oluşturuldu! Sözleşme adresini arkadaşlarınla paylaşabilirsin: " + deployedAddress);
    } catch (error) {
      setStatus("Yeni havuz oluşturulamadı: " + displayError(error));
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
      if (receipt && receipt.status === 1) {
  setLastTxHash(receipt.hash);
}
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
    <section id="tripsplit-panel" className="py-8 text-white">
      <div className="mx-auto max-w-3xl space-y-7">
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

        <div className="rounded-3xl border border-emerald-500/30 bg-[#10241f] p-6 space-y-4">
          <h2 className="text-xl font-bold">Yeni yolculuk havuzu oluştur</h2>
          <p className="text-sm text-slate-300">2–12 kişi seç. Her katılımcının ödeyeceği test MON tutarını belirle. Bu, TL cinsinden rota masrafıyla aynı değer değildir.</p>
          <label className="block text-sm text-slate-200">Katılımcı sayısı
            <select value={newLimit} onChange={(e) => setNewLimit(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-white/20 bg-[#081611] p-3 text-white">
              {Array.from({length: 11}, (_, i) => i + 2).map(n => <option key={n} value={n}>{n} kişi</option>)}
            </select>
          </label>
          <label className="block text-sm text-slate-200">Kişi başı test MON (örnek 0.001)
            <input value={newShare} onChange={e => setNewShare(e.target.value)} inputMode="decimal" className="mt-2 w-full rounded-xl border border-white/20 bg-[#081611] p-3" />
          </label>
          <label className="block text-sm text-slate-200">Demo istasyon adresi (0x...)
            <input value={newStation} onChange={e => setNewStation(e.target.value)} placeholder="0x..." className="mt-2 w-full rounded-xl border border-white/20 bg-[#081611] p-3" />
          </label>
          <label className="block text-sm text-slate-200">Remix TripSplit derleme çıktısı (.json)
            <input type="file" accept=".json,application/json" onChange={e => { void readArtifact(e.target.files?.[0]); }} className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-400 file:px-3 file:py-2 file:font-bold file:text-black" />
          </label>
          <p className="text-xs text-slate-400">Dosyanın ABI ve bytecode içermesi gerekir. İçinde özel anahtar bulunmamalıdır. Sadece Monad Testnet için kullanılmalı.</p>
          <button type="button" disabled={busy || !wallet || !artifact} onClick={createPool} className="rounded-xl bg-emerald-400 px-5 py-3 font-bold text-[#071310] disabled:opacity-50">Yeni Havuz Oluştur</button>
        </div>
            
{contractAddress && (
  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
    <h3 className="text-lg font-bold text-emerald-300">
      🔗 Yolculuk Davet Bağlantısı
    </h3>

    <p className="mt-2 text-sm text-slate-300">
      Bu bağlantıyı arkadaşlarınla paylaş.
      Kendi MetaMask cüzdanlarıyla havuza katılabilirler.
    </p>

    <button
      type="button"
      onClick={() => {
        const link =
          window.location.origin +
          "/?pool=" +
          encodeURIComponent(contractAddress) +
          "#tripsplit";

        navigator.clipboard.writeText(link)
          .then(() => setStatus("Davet bağlantısı kopyalandı!"))
          .catch(() => setStatus("Bağlantı kopyalanamadı."));
      }}
      className="mt-4 rounded-xl bg-emerald-400 px-5 py-3 font-bold text-[#071310]"
    >
      📋 Davet Bağlantısını Kopyala
    </button>
  </div>
)}

{lastTxHash && (
  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6">
    <div className="flex items-center gap-3">
      <span className="text-3xl">🧾</span>
      <div>
        <h3 className="text-xl font-bold text-emerald-300">
          FuelWis İşlem Makbuzu
        </h3>
        <p className="text-sm text-slate-300">
          İşlem Monad Testnet üzerinde onaylandı.
        </p>
      </div>
    </div>

    <p className="mt-5 text-xs text-slate-400">
      Blockchain işlem numarası
    </p>

    <p className="mt-2 break-all font-mono text-xs text-white">
      {lastTxHash}
    </p>

    <a
      href={`https://testnet.monadexplorer.com/tx/${lastTxHash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-5 inline-flex rounded-xl bg-emerald-400 px-5 py-3 font-bold text-[#071310]"
    >
      🔎 İşlemi Blockchain'de Gör →
    </a>

    <p className="mt-4 text-xs text-slate-400">
      Bu makbuz test MON işlemini doğrular.
      Gerçek yakıt satın alındığını kanıtlamaz.
    </p>
  </div>
)}

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
    </section>
  );
}
