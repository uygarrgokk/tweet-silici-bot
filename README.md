# Tweet silici

Kendi X hesabındaki yanıtları ve repostları, tarayıcıda açık olan oturumun üzerinden temizleyen küçük betikler. Kurulum yok, API anahtarı yok, ücret yok. Kod yalnızca senin bilgisayarında, X’in kendi düğmelerine basarak çalışır.

Silinen yanıt geri gelmez. Repostu geri almak da kalıcıdır.

Bu araç X’e ait değildir. Yalnızca kendi hesabında kullan.

## Hazırlık

1. Chrome’da kendi hesabınla [x.com](https://x.com) adresine gir.
2. Aşağıda yazan sayfayı aç. Betik, yanlış sayfadaysan kendini durdurur.
3. `F12` tuşuna bas, **Console** sekmesine geç.
4. İlk yapıştırmada Chrome `allow pasting` yazmanı isteyebilir. Yaz, Enter’a bas, sonra betiği yapıştır.
5. İlgili `.js` dosyasının tamamını kopyala, konsola yapıştır, Enter’a bas.
6. Sekmeyi kapatma. Bilgisayarın uykuya geçmesin.

Durdurmak için konsola şunu yazıp Enter’a bas:

```js
window.stopLoop = true
```

X çok hızlı silmede **Too Many Requests** der. Betik bunu görünce 5 dakika bekler, sonra kaldığı yerden devam eder. Konsolda bekleme saati yazar; o süre dolmadan sekmeyi kapatma.

Eski bir kopya hâlâ çalışıyorsa yenisini yapıştırmadan önce `window.stopLoop = true` yaz ve sayfayı yenile.

## Saklamak istediklerin

Üç betik de sağ alttaki yer işareti **mavi** olan gönderiye dokunmaz. Saklamak istediğini, betiği çalıştırmadan önce yer işaretine ekle.

- Yanıt ve repost betikleri o kartı atlar, konsolda `Yer işareti mavi` yazar ve bir sonrakine geçer.
- Eklenti betiği **Select All** dedikten sonra mavi yer işaretli satırın tikini kaldırır, sonra kalanları siler.

## Yanıtları silmek

Dosya: `delete-replies.js`

Sayfa: `https://x.com/KULLANICI_ADIN/with_replies`

Betik, listedeki kendi yanıtlarının **⋯ → Sil → onay** adımlarını tek tek yapar. Her silmeden sonra kısa bir ara verir.

Konsolda `Görünen kendi yanıtın kalmadı` yazarsa sayfayı yenile ve betiği yeniden yapıştır. X eski yanıtları parça parça yükler.

Başka insanların sana attığı mention’lar bu listede görünmez ve silinemez.

## Repostları geri almak

Dosya: `undo-reposts.js`

Sayfa: `https://x.com/KULLANICI_ADIN/all`

Bu sayfada kendi gönderilerin ile repostların bir aradadır. Betik yalnızca altındaki repost düğmesi **yeşil** olanları geri alır. Kendi yazdığın gönderiye dokunmaz. Yer işareti mavi olan repost da kalır.

Konsolda `Görünen repost kalmadı` yazarsa sayfayı yenileyip betiği tekrar çalıştır.

## Eklentiyle toplu silmek

Dosya: `delete-one-batch.js`

Bu betik sayfadaki gönderiye kendisi basmaz. **Delete Twitter Posts** eklentisinin panelindeki **Select All** ve **Delete Selected** düğmelerini kullanır. Panel kapalıysa çalışacak düğme bulamaz.

Eklenti yalnızca orijinal gönderileri listeler. Yanıt ve repost için yukarıdaki iki betiği kullan.

Her turdan sonra 80 saniye bekler. Bir turda 20’den fazla öğe seçilmişse güvenlik için silmez.
