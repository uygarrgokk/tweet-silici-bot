// All sayfasında çalışır: https://x.com/KULLANICI_ADIN/all
// Yeşil repost düğmesi olanları geri alır. Yer işareti maviyse o repostu atlar.
// Durdurmak için konsola: window.stopLoop = true

window.stopLoop = false;

(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const parts = location.pathname.split("/").filter(Boolean);
  const handle = parts[0];
  const section = parts[1] || "";

  if (!handle || section !== "all") {
    console.error(
      "Bu kod All sayfasında çalışır. Adres şöyle olmalı: https://x.com/KULLANICI_ADIN/all",
    );
    return;
  }

  console.info("Repost geri alma başladı.");
  console.info("Durdurmak için konsola window.stopLoop = true yaz.");

  const labelOf = (element) =>
    (element.innerText || element.textContent || element.getAttribute("aria-label") || "")
      .replace(/\s+/g, " ")
      .trim();

  const articles = () => [...document.querySelectorAll('article[data-testid="tweet"]')];

  const isGreen = (button) => {
    const nodes = [button, ...button.querySelectorAll("svg, path, div, span")];
    return nodes.some((node) => {
      const style = getComputedStyle(node);
      return /0,\s*186,\s*124|#00ba7c/i.test(`${style.color} ${style.fill}`);
    });
  };

  const undoButton = (article) => {
    const button = article.querySelector('button[data-testid="unretweet"]');
    if (!button || !isGreen(button)) return null;
    return button;
  };

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

  const findUndoItem = () =>
    document.querySelector('[data-testid="unretweetConfirm"]') ||
    [...document.querySelectorAll('[role="menuitem"]')].find((item) =>
      /undo (re)?post|undo retweet|yeniden gönder(me)?yi geri al|yeniden göndermeyi geri al|yeniden paylaşımı geri al/i.test(
        labelOf(item),
      ),
    );

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
      `X limiti doldu (Too Many Requests). ${until.toLocaleTimeString("tr-TR")} kadar bekleniyor, sonra aynı repostla devam edilecek.`,
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    while (!window.stopLoop && Date.now() < rateLimitedUntil) {
      await wait(5000);
    }
    return true;
  };

  const skipped = new WeakSet();
  const attempts = new WeakMap();
  let undone = 0;
  let stuck = 0;
  let toastPauseDone = false;

  while (!window.stopLoop) {
    const article = articles().find((item) => !skipped.has(item) && undoButton(item) && !isBookmarked(item));

    for (const item of articles()) {
      if (!skipped.has(item) && undoButton(item) && isBookmarked(item)) {
        skipped.add(item);
        console.info("Yer işareti mavi, bu repost atlandı.");
      }
    }

    if (!article) {
      const before = document.documentElement.scrollHeight;
      const atEnd = window.scrollY + window.innerHeight >= before - 80;
      window.scrollBy(0, 1600);
      await wait(2500);
      const after = document.documentElement.scrollHeight;
      if (atEnd && after === before) {
        stuck += 1;
        if (stuck >= 3) {
          console.info(`Görünen repost kalmadı. Geri alınan: ${undone}. Kalan varsa sayfayı yenileyip kodu tekrar çalıştır.`);
          break;
        }
      } else {
        stuck = 0;
      }
      continue;
    }

    stuck = 0;
    article.scrollIntoView({ block: "center" });
    await wait(400);

    const button = undoButton(article);
    if (!button) {
      skipped.add(article);
      continue;
    }

    button.click();
    await wait(700);

    const undoItem = findUndoItem();
    if (!undoItem) {
      if (!undoButton(article)) {
        undone += 1;
        console.info(`Geri alındı: ${undone}`);
        await wait(1500);
        continue;
      }
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      const tried = (attempts.get(article) || 0) + 1;
      attempts.set(article, tried);
      if (tried >= 3) {
        skipped.add(article);
        console.warn("Bu repost üç denemede geri alınamadı, atlandı.");
      }
      await wait(500);
      continue;
    }

    const seenLimitAt = rateLimitedUntil;
    undoItem.click();
    await wait(2000);

    const toastShown = limitMessageVisible();
    if (rateLimitedUntil > seenLimitAt || (toastShown && !toastPauseDone)) {
      await waitOutLimit();
      toastPauseDone = true;
      continue;
    }
    if (!toastShown) toastPauseDone = false;

    if (document.contains(article) && undoButton(article)) {
      const tried = (attempts.get(article) || 0) + 1;
      attempts.set(article, tried);
      if (tried >= 3) {
        skipped.add(article);
        console.warn("Bu repost üç denemede geri alınamadı, atlandı.");
      }
      continue;
    }

    undone += 1;
    console.info(`Geri alındı: ${undone}`);
    await wait(1500);
  }

  if (window.stopLoop) console.info("Döngü durduruldu. Geri alınan:", undone);
})();
