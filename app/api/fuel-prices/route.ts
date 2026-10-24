import { NextResponse } from "next/server";

type Province = {
  name: string;
  slug?: string;
  effective?: string;
  median?: { benzin?: string | null; motorin?: string | null };
  lpg?: { median?: string | null } | null;
};
type Payload = { provinces?: Province[]; retrieved_at?: string };

const normalized = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
const toNumber = (v: string | null | undefined) => {
  const n = Number(v);
  return v != null && v !== "" && Number.isFinite(n) && n > 0 ? n : null;
};
const mean = (values: (number | null)[]) => {
  const nums = values.filter((value): value is number => value !== null);
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) * 100 / nums.length) / 100 : null;
};

export async function GET(request: Request) {
  const city = new URL(request.url).searchParams.get("city")?.trim() || "Ankara";
  try {
    const response = await fetch("https://guncelakaryakitfiyatlari.com/veri/fiyatlar.json", {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error("Kaynak bağlantısı başarısız");
    const data = await response.json() as Payload;
    if (!Array.isArray(data.provinces)) throw new Error("Kaynak biçimi değişmiş");
    const cityKey = normalized(city);
    const matches = cityKey === "istanbul"
      ? data.provinces.filter((p) => (p.slug ?? "").startsWith("istanbul-") && (p.slug ?? "").includes("yakasi"))
      : data.provinces.filter((p) => normalized(p.name) === cityKey || normalized(p.slug ?? "") === cityKey);
    if (!matches.length) return NextResponse.json({ error: "Bu şehir için fiyat bulunamadı" }, { status: 404 });
    const prices = {
      benzin: mean(matches.map((p) => toNumber(p.median?.benzin))),
      motorin: mean(matches.map((p) => toNumber(p.median?.motorin))),
      lpg: mean(matches.map((p) => toNumber(p.lpg?.median))),
    };
    if (Object.values(prices).every((v) => v === null)) return NextResponse.json({ error: "Bu şehirde geçerli fiyat yok" }, { status: 404 });
    return NextResponse.json({ city, currency: "TRY", prices, updatedAt: data.retrieved_at ?? null,
      effective: matches.length === 1 ? matches[0].effective ?? null : null,
      method: matches.length > 1 ? "İstanbul yakalarının medyan fiyat ortalaması" : "İl bazlı dağıtıcı fiyatlarının medyanı",
      source: "EPDK; derleyen: Güncel Akaryakıt Fiyatları (guncelakaryakitfiyatlari.com)",
      note: "Referans fiyat, gerçek pompa fiyatından farklı olabilir." });
  } catch (err) {
    console.error("FuelWis price source error:", err);
    return NextResponse.json({ error: "Fiyat servisine geçici olarak ulaşılamadı" }, { status: 502 });
  }
}
