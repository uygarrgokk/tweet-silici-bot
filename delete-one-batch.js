
// İstediğinde durdurabilmen için bir anahtar değişken

window.stopLoop = false;

 

(async () => {

  // Bekleme yapabilmek için yardımcı fonksiyon (Milisaniye cinsinden)

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

 

  console.info("🔄 Otomatik silme döngüsü başlatıldı.");

  console.info("🛑 Durdurmak istersen konsola 'window.stopLoop = true;' yazıp Enter'a basabilirsin.");

 

  while (!window.stopLoop) {

    try {

      console.info("⏳ Yeni parti silme işlemi aranıyor...");

 

      const controlSelector = 'button, [role="button"], input[type="button"], input[type="submit"]';

 

      const queryOpenShadowRoots = (selector) => {

        const elements = [];

        const visited = new Set();

        const roots = [document];

 

        while (roots.length > 0) {

          const root = roots.pop();

          if (visited.has(root)) continue;

          visited.add(root);

          elements.push(...root.querySelectorAll(selector));

 

          for (const element of root.querySelectorAll("*")) {

            if (element.shadowRoot) roots.push(element.shadowRoot);

          }

        }

        return elements;

      };

 

      const visible = (element) => {

        const style = getComputedStyle(element);

        const rect = element.getBoundingClientRect();

        return (

          style.display !== "none" &&

          style.visibility !== "hidden" &&

          rect.width > 0 &&

          rect.height > 0

        );

      };

 

      const controls = queryOpenShadowRoots(controlSelector).filter(visible);

      const label = (element) =>

        (

          element.innerText ||

          element.textContent ||

          element.value ||

          element.getAttribute("aria-label") ||

          ""

        )

          .replace(/\s+/g, " ")

          .trim();

         

      const selectButtons = controls.filter(

        (element) => /\bselect\s+all\b/i.test(label(element)),

      );

 

      // Sayfada silinecek öğe kalmadıysa hata fırlatmak yerine bekle

      if (selectButtons.length === 0) {

        console.info("ℹ️ Ekranda 'Select All' butonu bulunamadı. Öğeler yükleniyor olabilir veya silinecek öğe kalmadı.");

      } else {

        if (selectButtons.length !== 1) {

          throw new Error(`Görünür "Select All" düğmesinden tam bir tane bekleniyordu; bulunan: ${selectButtons.length}.`);

        }

 

        // Eğer zaten seçili öğeler varsa temizle uyarısı vermek yerine doğrudan silmeyi denemek daha mantıklı

        // Ancak orjinal koddaki Select All işlemini devam ettiriyoruz.

        if (!controls.some((element) => /^delete selected\b/i.test(label(element)))) {

          selectButtons[0].click();

        }

 

        const isBlue = (button) => {

          const nodes = [button, ...button.querySelectorAll("svg, path, div, span")];

          return nodes.some((node) => {

            const style = getComputedStyle(node);

            return /29,\s*155,\s*240|#1d9bf0/i.test(`${style.color} ${style.fill}`);

          });

        };

 

        const isBookmarked = (article) => {

          const saved = article.querySelector('button[data-testid="removeBookmark"]');

          if (saved) return true;

          const bookmark = article.querySelector('button[data-testid="bookmark"]');

          return Boolean(bookmark && isBlue(bookmark));

        };

 

        const bookmarkedIds = new Set(

          [...document.querySelectorAll('article[data-testid="tweet"]')]

            .filter(isBookmarked)

            .map((article) => {

              const href = article.querySelector('a[href*="/status/"]')?.getAttribute("href") || "";

              return href.match(/status\/(\d+)/)?.[1];

            })

            .filter(Boolean),

        );

 

        const uncheckBookmarked = () => {

          const boxes = queryOpenShadowRoots('input[type="checkbox"], [role="checkbox"]').filter(visible);

          let kept = 0;

          for (const box of boxes) {

            const row = box.closest("tr, [role='row'], li") || box.parentElement?.parentElement;

            if (!row) continue;

            const text = label(row);

            const id = text.match(/\b\d{15,}\b/)?.[0];

            const marked =

              (id && bookmarkedIds.has(id)) ||

              [...row.querySelectorAll("button, [role='button']")].some((button) => {

                const testId = button.getAttribute("data-testid") || "";

                return testId === "removeBookmark" || (testId === "bookmark" && isBlue(button));

              });

            if (!marked) continue;

            const checked = box.matches("input")

              ? box.checked

              : box.getAttribute("aria-checked") === "true";

            if (!checked) continue;

            box.click();

            kept += 1;

          }

          if (kept) {

            console.info(`Yer işareti mavi olan ${kept} öğenin seçimi kaldırıldı, silinmedi.`);

          }

          return kept;

        };

 

        const deadline = Date.now() + 5000;

        let deleteButton;

        let selectedCount;

 

        while (Date.now() < deadline) {

          const currentControls = queryOpenShadowRoots(controlSelector).filter(visible);

          const candidates = currentControls.filter((element) =>

            /\bdelete\s+selected\b/i.test(label(element)),

          );

          const match = candidates

            .map((element) => ({

              element,

              count: label(element).match(/\bdelete\s+selected\s*\(\s*(\d+)\s*\)/i),

            }))

            .find((candidate) => candidate.count);

 

          if (candidates.length === 1 && match) {

            deleteButton = match.element;

            selectedCount = Number(match.count[1]);

            break;

          }

 

          await wait(150);

        }

 

        if (!deleteButton || !Number.isInteger(selectedCount) || selectedCount < 1) {

          throw new Error('"Delete Selected" düğmesi 5 saniye içinde bulunamadı.');

        }

 

        uncheckBookmarked();

        await wait(400);

 

        const refreshedControls = queryOpenShadowRoots(controlSelector).filter(visible);

        const refreshed = refreshedControls

          .map((element) => ({

            element,

            count: label(element).match(/\bdelete\s+selected\s*\(\s*(\d+)\s*\)/i),

          }))

          .find((candidate) => candidate.count);

 

        if (refreshed) {

          deleteButton = refreshed.element;

          selectedCount = Number(refreshed.count[1]);

        }

 

        if (!Number.isInteger(selectedCount) || selectedCount < 1) {

          console.info("Seçili kalan öğe yok. Yer işaretli olanlar duruyor.");

          await wait(80000);

          continue;

        }

 

        if (selectedCount > 20) {

          throw new Error(`Eklenti 20'den fazla öğe seçmiş görünüyor (${selectedCount}); güvenlik için silme başlatılmadı.`);

        }

 

        console.info(`🗑️ ${selectedCount} öğe seçildi. Silme işlemi başlatılıyor...`);

 

        // Tüm yerleşik JS pencerelerini (alert, confirm, prompt) ez

        const originalAlert = window.alert;

        const originalConfirm = window.confirm;

        const originalPrompt = window.prompt;

 

        window.alert = function() { return true; };

        window.confirm = function() { return true; };

        window.prompt = function() { return true; };

 

        // Silme butonuna tıkla

        deleteButton.click();

 

        // Fonksiyonları 2 saniye sonra geri yükle

        setTimeout(() => {

          window.alert = originalAlert;

          window.confirm = originalConfirm;

          window.prompt = originalPrompt;

        }, 2000);

       

        console.info("✅ Silme komutu gönderildi.");

      }

 

    } catch (error) {

      console.error("⚠️ Bu turda bir pürüz çıktı:", error.message);

      console.info("Sonraki döngüde tekrar denenecek.");

    }

 

    // Her denemeden (veya başarılı silme işleminden) sonra TAM 80 SANİYE (80000 ms) bekle

    console.info("⏱️ 80 saniye bekleniyor...");

    await wait(80000);

  }

 

  console.info("🛑 Döngü manuel olarak durduruldu.");

})();