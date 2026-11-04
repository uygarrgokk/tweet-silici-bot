// Posts seçiliyken çalışır: https://x.com/KULLANICI_ADIN
// Yer işareti mavi olan gönderi silinmez.
// Durdurmak için konsola: window.stopLoop = true

window.stopLoop = false;

(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const parts = location.pathname.split("/").filter(Boolean);
  const handle = parts[0] || "";
  const section = parts[1] || "";
  const reserved = new Set([
    "home",
    "explore",
    "search",
    "settings",
    "messages",
    "notifications",
    "i",
    "compose",
    "intent",
  ]);

  if (!handle || reserved.has(handle.toLowerCase()) || section !== "") {
    console.error(
      "Bu kod yalnızca Posts seçiliyken çalışır. Adres şöyle olmalı: https://x.com/KULLANICI_ADIN",
    );
    return;
  }

  console.info("Gönderi silme başladı.");
  console.info("Durdurmak için konsola window.stopLoop = true yaz.");

  const labelOf = (element) =>
    (element.innerText || element.textContent || element.getAttribute("aria-label") || "")
      .replace(/\s+/g, " ")
      .trim();

  const isOwnArticle = (article) =>
    [...article.querySelectorAll("a[href]")].some((link) => {
      const href = (link.getAttribute("href") || "").replace(/\/$/, "").toLowerCase();
      return href === `/${handle.toLowerCase()}`;
    });

  const ownArticles = () =>
    [...document.querySelectorAll('article[data-testid="tweet"]')].filter(isOwnArticle);

  const findMenuItem = (pattern) =>
    [...document.querySelectorAll('[role="menuitem"]')].find((item) =>
      pattern.test(labelOf(item)),
    );

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

  const rateLimitPattern = /too many requests|rate limit|çok fazla istek/i;
  const limitWaitMs = 300 * 1000;
  let rateLimitedUntil = 0;

  const rememberRateLimit = (status) => {
    if (status !== 429) return;
    rateLimitedUntil = Math.max(rateLimitedUntil, Date.now() + limitWaitMs);
  };

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    rememberRateLimit(response.status);
    return response;
  };

  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", () => {
      rememberRateLimit(this.status);
    });
    return originalSend.apply(this, args);
  };

  const limitMessageVisible = () =>
    [...document.querySelectorAll('[role="alert"], [data-testid="toast"]')].some((item) =>
      rateLimitPattern.test(labelOf(item)),
    );

  const waitOutLimit = async () => {
    if (rateLimitedUntil <= Date.now() && limitMessageVisible()) {
      rateLimitedUntil = Date.now() + limitWaitMs;
    }
    if (rateLimitedUntil <= Date.now()) return false;

    const until = new Date(rateLimitedUntil);
    console.warn(
      `X limiti doldu (Too Many Requests). ${until.toLocaleTimeString("tr-TR")} kadar bekleniyor, sonra aynı gönderiyle devam edilecek.`,
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    while (!window.stopLoop && Date.now() < rateLimitedUntil) {
      await wait(5000);
    }
    return true;
  };

  const skipped = new WeakSet();
  const attempts = new WeakMap();
  let deleted = 0;
  let emptyPasses = 0;
  let toastPauseDone = false;

  while (!window.stopLoop) {
    const article = ownArticles().find((item) => !skipped.has(item) && !isBookmarked(item));

    for (const item of ownArticles()) {
      if (!skipped.has(item) && isBookmarked(item)) {
        skipped.add(item);
        console.info("Yer işareti mavi, bu gönderi atlandı.");
      }
    }

    if (!article) {
      emptyPasses += 1;
      window.scrollBy(0, 1200);
      await wait(3000);
      if (emptyPasses >= 4) {
        console.info(
          `Görünen gönderi kalmadı. Silinen: ${deleted}. Eski gönderiler kaldıysa sayfayı yenileyip kodu tekrar çalıştır.`,
        );
        break;
      }
      continue;
    }

    emptyPasses = 0;
    article.scrollIntoView({ block: "center" });
    await wait(400);

    if (isBookmarked(article)) {
      skipped.add(article);
      console.info("Yer işareti mavi, bu gönderi atlandı.");
      continue;
    }

    const more = article.querySelector(
      'button[data-testid="caret"], button[aria-label="More"], button[aria-label="Daha fazla"]',
    );

    if (!more) {
      skipped.add(article);
      continue;
    }

    more.click();
    await wait(700);

    const deleteItem = findMenuItem(/^(delete|sil)$/i);
    if (!deleteItem) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      skipped.add(article);
      console.info("Sil seçeneği yok, atlandı.");
      await wait(500);
      continue;
    }

    deleteItem.click();

    const deadline = Date.now() + 5000;
    let confirmButton;
    while (Date.now() < deadline && !confirmButton) {
      confirmButton = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (!confirmButton) await wait(200);
    }

    if (!confirmButton) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      skipped.add(article);
      console.warn("Onay penceresi açılmadı, bu gönderi atlandı.");
      continue;
    }

    const seenLimitAt = rateLimitedUntil;
    confirmButton.click();
    await wait(2000);

    const toastShown = limitMessageVisible();
    if (rateLimitedUntil > seenLimitAt || (toastShown && !toastPauseDone)) {
      await waitOutLimit();
      toastPauseDone = true;
      continue;
    }
    if (!toastShown) toastPauseDone = false;

    if (document.contains(article)) {
      const tried = (attempts.get(article) || 0) + 1;
      attempts.set(article, tried);
      if (tried >= 3) {
        skipped.add(article);
        console.warn("Bu gönderi üç denemede silinemedi, atlandı.");
      }
      continue;
    }

    deleted += 1;
    console.info(`Silindi: ${deleted}`);
    await wait(1500);
  }

  if (window.stopLoop) console.info("Döngü durduruldu. Silinen:", deleted);
})();
