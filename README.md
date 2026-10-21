# RoboSoutěž 2026 (PWA)

Verze 1.0.0 · 21. 10. 2026. Úvodní obrazovka → sekce Pravidla, Simulace, Návrhy.

Statická webová aplikace, žádný server ani databáze. Data (rozložení dílů) zůstávají jen v prohlížeči zařízení.

## Nasazení
1. Nahrajte obsah složky do libovolného adresáře na webu s **HTTPS** (bez HTTPS se PWA nenainstaluje).
   Vhodná je vlastní subdoména, např. `domino.vasedomena.cz`.
2. Apache: soubor `.htaccess` nastaví bezpečnostní hlavičky a cache.
   Nginx: přidejte stejné hlavičky (Content-Security-Policy, X-Content-Type-Options, Referrer-Policy)
   a pro `sw.js`, `index.html` a `manifest.webmanifest` nastavte `Cache-Control: no-cache`.
3. Otevřete adresu v mobilu:
   - Android / Chrome: menu ⋮ → **Instalovat aplikaci** (nebo „Přidat na plochu“).
   - iPhone / Safari: Sdílet → **Přidat na plochu**.

Lze použít i zdarma GitHub Pages, Netlify nebo Cloudflare Pages (u nich `.htaccess` neplatí, CSP je i v `index.html`).

## Aktualizace
Po změně souborů zvyšte `VERSION` v `sw.js` (např. `robosoutez-1.0.1`) a číslo verze v `index.html`, jinak zařízení drží starou verzi z cache.

## Bezpečnost a rychlost
- Žádné externí skripty, písma ani sledování; vše se načítá z vlastní domény.
- Přísná CSP (jen vlastní původ, žádné inline skripty a styly).
- Po první návštěvě běží offline z cache service workeru.
