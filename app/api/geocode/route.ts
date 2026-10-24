import { NextRequest, NextResponse } from "next/server";

type GeoFeature = {
  geometry?: { coordinates?: number[] };
  properties?: { label?: string; name?: string };
};

export async function GET(request: NextRequest) {
  const key = process.env.ORS_API_KEY;
  if (!key) return NextResponse.json({ error: "ORS_API_KEY bulunamadı." }, { status: 500 });

  const query = request.nextUrl.searchParams.get("text")?.trim() ?? "";
  if (query.length < 3 || query.length > 160) {
    return NextResponse.json({ error: "En az 3, en fazla 160 karakterlik adres gir." }, { status: 400 });
  }

  const url = new URL("https://api.openrouteservice.org/geocode/search");
  url.searchParams.set("text", query);
  url.searchParams.set("boundary.country", "TR");
  url.searchParams.set("size", "5");
  try {
    const response = await fetch(url.toString(), {
      headers: { Authorization: key, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return NextResponse.json(
      { error: response.status === 429 ? "Adres arama limiti doldu, biraz sonra dene." : "Adres arama servisi yanıt vermedi." },
      { status: 502 }
    );
    const data: { features?: GeoFeature[] } = await response.json();
    const results = (data.features ?? []).flatMap((feature) => {
      const p = feature.geometry?.coordinates;
      if (!p || p.length < 2 || !p.slice(0,2).every(Number.isFinite)) return [];
      return [{ label: feature.properties?.label ?? feature.properties?.name ?? query, coordinates: [p[0], p[1]] }];
    });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Adres arama sunucusuna bağlanılamadı." }, { status: 502 });
  }
}
