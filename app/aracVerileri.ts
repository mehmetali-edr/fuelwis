export type Vehicle = {
  brand: string;
  model: string;
  year: number;
  engine: string;
  fuel: "Benzin" | "Motorin" | "LPG";
  consumption: number;
  dataType: "Üretici WLTP referansı" | "Tahmini";
  sourceUrl?: string;
  sourceNote?: string;
};

// Kaynaklı değerler yalnızca belirtilen motor/şanzıman konfigürasyonu içindir.
// Üretici web sayfasındaki model yılı/versiyon farkları tüketimi değiştirebilir.
export const VEHICLES: Vehicle[] = [
  { brand: "Toyota", model: "Corolla", year: 2026, engine: "1.5 Multidrive S (otomatik) — WLTP", fuel: "Benzin", consumption: 6.1, dataType: "Üretici WLTP referansı", sourceUrl: "https://www.toyota.com.tr/araba-modelleri/corolla-sedan/olustur", sourceNote: "Toyota Corolla Vision Plus 1.5 Multidrive S konfigüratöründeki birleşik WLTP (6,1). Donanıma göre 6,1–6,3 olabilir." },
  { brand: "Toyota", model: "Corolla", year: 2026, engine: "1.8 Hybrid e-CVT — WLTP", fuel: "Benzin", consumption: 4.7, dataType: "Üretici WLTP referansı", sourceUrl: "https://www.toyota.com.tr/araba-modelleri/corolla-sedan", sourceNote: "Toyota 1.8 Hybrid e-CVT birleşik WLTP, versiyon ve donanıma göre farklılaşabilir." },
  { brand: "BMW", model: "3 Serisi", year: 2026, engine: "320i Sedan otomatik — WLTP", fuel: "Benzin", consumption: 7.6, dataType: "Üretici WLTP referansı", sourceUrl: "https://www.bmw.com.tr/tr/all-models/3-series/bmw-3-serisi-sedan/bmw-3-serisi-sedan-teknik-veriler.html", sourceNote: "BMW Türkiye 320i Sedan WLTP birleşik tüketim. Donanım ve üretim versiyonuna göre farklılaşabilir." },
  // Aşağıdaki kayıtlar henüz yıl + şanzıman + donanım düzeyinde üreticiyle teyit edilmemiştir.
  { brand: "Toyota", model: "Corolla", year: 2022, engine: "1.5 Vision", fuel: "Benzin", consumption: 6.3 , dataType: "Tahmini" },
  { brand: "Toyota", model: "C-HR", year: 2023, engine: "1.8 Hybrid", fuel: "Benzin", consumption: 4.8 , dataType: "Tahmini" },
  { brand: "Renault", model: "Clio", year: 2023, engine: "1.0 TCe", fuel: "Benzin", consumption: 5.5 , dataType: "Tahmini" },
  { brand: "Renault", model: "Megane", year: 2022, engine: "1.3 TCe", fuel: "Benzin", consumption: 6.5 , dataType: "Tahmini" },
  { brand: "Fiat", model: "Egea", year: 2022, engine: "1.3 Multijet", fuel: "Motorin", consumption: 4.7 , dataType: "Tahmini" },
  { brand: "Fiat", model: "Egea", year: 2023, engine: "1.4 Fire", fuel: "Benzin", consumption: 7.1 , dataType: "Tahmini" },
  { brand: "BMW", model: "3 Serisi", year: 2024, engine: "320i", fuel: "Benzin", consumption: 7.6 , dataType: "Tahmini" },
  { brand: "BMW", model: "1 Serisi", year: 2023, engine: "118i", fuel: "Benzin", consumption: 6.4 , dataType: "Tahmini" },
  { brand: "Mercedes-Benz", model: "A Serisi", year: 2023, engine: "A 200", fuel: "Benzin", consumption: 6.2 , dataType: "Tahmini" },
  { brand: "Mercedes-Benz", model: "C Serisi", year: 2023, engine: "C 200", fuel: "Benzin", consumption: 7.1 , dataType: "Tahmini" },
  { brand: "Volkswagen", model: "Polo", year: 2023, engine: "1.0 TSI", fuel: "Benzin", consumption: 5.7 , dataType: "Tahmini" },
  { brand: "Volkswagen", model: "Golf", year: 2023, engine: "1.5 TSI", fuel: "Benzin", consumption: 6.1 , dataType: "Tahmini" },
  { brand: "Audi", model: "A3", year: 2023, engine: "35 TFSI", fuel: "Benzin", consumption: 6.0 , dataType: "Tahmini" },
  { brand: "Hyundai", model: "i20", year: 2023, engine: "1.0 T-GDI", fuel: "Benzin", consumption: 6.1 , dataType: "Tahmini" },
  { brand: "Kia", model: "Sportage", year: 2023, engine: "1.6 T-GDI", fuel: "Benzin", consumption: 6.9 , dataType: "Tahmini" },
  { brand: "Dacia", model: "Duster", year: 2023, engine: "1.0 ECO-G", fuel: "LPG", consumption: 8.0 , dataType: "Tahmini" },
];
