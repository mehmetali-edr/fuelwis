
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const key = process.env.ORS_API_KEY;

  if (!key) {
    return NextResponse.json(
      { error: "ORS_API_KEY bulunamadı." },
      { status: 500 }
    );
  }

  const params = request.nextUrl.searchParams;

  const start = params.get("start")?.split(",").map(Number);
  const end = params.get("end")?.split(",").map(Number);

  const valid = (point?: number[]) =>
    point?.length === 2 &&
    point.every(Number.isFinite) &&
    Math.abs(point[0]) <= 180 &&
    Math.abs(point[1]) <= 90;

  if (!valid(start) || !valid(end)) {
    return NextResponse.json(
      { error: "Geçersiz koordinatlar." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      {
        method: "POST",
        headers: {
          Authorization: key,
          "Content-Type": "application/json",
          Accept: "application/geo+json",
        },
        body: JSON.stringify({
          coordinates: [start, end],
        }),
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Rota servisi yanıt vermedi.", status: response.status },
        { status: 502 }
      );
    }

    const data = await response.json();
    const route = data.features?.[0];

    if (!route?.geometry?.coordinates || !route?.properties?.summary) {
      return NextResponse.json(
        { error: "Bu noktalar arasında rota bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      distanceKm: Number(
        (route.properties.summary.distance / 1000).toFixed(2)
      ),
      durationMin: Math.round(
        route.properties.summary.duration / 60
      ),
      coordinates: route.geometry.coordinates,
    });
  } catch {
    return NextResponse.json(
      { error: "Rota sunucusuna bağlanılamadı." },
      { status: 502 }
    );
  }
}
