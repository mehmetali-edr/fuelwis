# FuelWis — Akıllı Rota, Yakıt Hesabı ve Monad TripSplit

**FuelWis**, kullanıcıların araçlarına göre yolculuk rotalarını ve tahmini yakıt maliyetlerini hesaplamalarına, grup yolculukları için **Monad Testnet** üzerinde ortak demo ödeme havuzu oluşturmalarına yardımcı olan bir web uygulamasıdır.

🌐 **Canlı demo:** https://fuelwis.vercel.app/  
💻 **Kaynak kod:** https://github.com/mehmetali-edr/fuelwis

> **Hackathon demosu:** FuelPay ve TripSplit işlemleri yalnızca Monad Testnet üzerindeki test MON ile yapılır. Gerçek TL ödemesi, akaryakıt satışı veya fiziksel yakıt teslimi yapılmaz.

## Özellikler

- **Araç seçimi:** Marka, model, yıl ve motor bilgileriyle yakıt tüketimi hesabı. Bazı araçlar üretici WLTP referanslarına dayanır; diğerleri açıkça *tahmini* olarak gösterilir.
- **Rota planlama:** Haritadan iki konum seçme veya adres/mekân arama; karayolu mesafesi ve tahmini sürüş süresi.
- **Yakıt maliyeti:** Mesafe × 100 km başına tüketim × litre fiyatı üzerinden otomatik litre ve TL tahmini.
- **İl bazlı yakıt fiyatları:** Dış veri kaynağından alınan referans fiyatlar; istasyondaki pompa fiyatı farklı olabilir. Veri alınamazsa manuel giriş kullanılabilir.
- **TripSplit:** 2–12 kişilik havuzlar oluşturma; katılımcıların kendi cüzdanlarıyla test MON katkısı yapması, zincir üstünde katkı durumunu görmesi, sözleşme koşullarına göre iptal/iade.
- **FuelPay Demo:** Tamamlanan havuzun test MON bakiyesini önceden belirlenen demo istasyonu cüzdanına aktarma ve işlem makbuzu / blok gezgini bağlantısı gösterme.
- **Davet bağlantısı:** Havuz sözleşme adresini bağlantı üzerinden diğer katılımcılarla paylaşma.

## Teknolojiler

Next.js (App Router), React, TypeScript, Tailwind CSS, Leaflet / React Leaflet, OpenRouteService, ethers.js, Solidity ve Monad Testnet (**Chain ID: 10143**). Dağıtım: Vercel.

## Yerel kurulum

```bash
git clone https://github.com/mehmetali-edr/fuelwis.git
cd fuelwis
npm install
```

Proje kökünde **`.env.local`** oluşturun:

```env
ORS_API_KEY=YOUR_OPENROUTESERVICE_API_KEY
```

Windows PowerShell'de:

```powershell
npm.cmd run dev
```

Diğer terminallerde `npm run dev` kullanılabilir. Ardından tarayıcıda http://localhost:3000 adresine gidin.

Üretim derlemesi:

```bash
npm run build
```

### Dağıtım

Vercel'de GitHub deposunu import edin; **Settings → Environment Variables** altında `ORS_API_KEY` değerini Production ortamına ekleyin ve dağıtın. API anahtarını GitHub deposuna veya `NEXT_PUBLIC_` ile istemciye koymayın.

## Blockchain demo akışı

1. MetaMask'ta **Monad Testnet (10143)** ağını seçin; işlem için test MON gerekir.
2. FuelWis'ta rota ve araç seçerek yaklaşık yakıt giderini hesaplayın.
3. TripSplit ile kişi sayısını (2–12) ve **ayrı bir test MON katkı miktarını** belirleyin. TL maliyeti test MON'a otomatik dönüştürülmez.
4. Kullanıcılar davet bağlantısı üzerinden havuza gelir ve kendi MetaMask hesaplarından katkıda bulunurlar.
5. Sözleşmenin katılımcı hedefi ve süre koşulları sağlanırsa FuelPay Demo ile test MON önceden tanımlı demo istasyon cüzdanına aktarılabilir. İşlem numarası blok gezgininde doğrulanabilir.

**Not:** Her sözleşme için süre sınırı bulunur (mevcut demoda oluşturulduktan sonra 2 saat). Hedef dolmadan ödeme yapılamaz. İade, yalnızca sözleşmedeki iptal / süre sonu koşullarına göre ve istasyon aktarımı gerçekleşmeden mümkündür.

## Veri doğruluğu ve sınırlamalar

- Yakıt tüketimi sürüş tarzı, trafik, hava, yük, lastikler ve donanıma göre değişir. Sonuçlar tahminidir.
- Üretici WLTP referansları yalnızca doğru yıl/motor/donanım eşleştirmesi için geçerlidir. Tahmini olarak işaretlenmiş araç değerleri resmî fabrika verisi değildir.
- İl bazlı akaryakıt fiyatları referanstır; gerçek pompa fiyatları değişebilir.
- Rota, adres arama ve canlı fiyat hizmetleri üçüncü taraf API'lere ve hizmet kullanılabilirliğine bağlıdır.
- Blockchain kayıtları bir yakıt teslimatı kanıtı değildir. Demo istasyonu, gerçek bir akaryakıt satış entegrasyonu değildir.
- Akıllı sözleşmeler güvenlik denetiminden geçmemiştir. **Gerçek fonlarla kullanmayın.**

## Hackathon sunumu

90 saniyelik demoda araç ve rota seçimi, tahmini yakıt maliyeti, TripSplit havuz durumu ve FuelPay'in testnet ödeme akışı gösterilir. Tamamlanmamış gerçek yakıt satın alımı özelliği varmış gibi sunulmaz.
