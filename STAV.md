# STAV.md

Paměť projektu mezi agenty a mezi dny. Každý agent čte celý soubor
a po sobě aktualizuje jen svou sekci. Koordinátor udržuje „Souhrn“.

## Souhrn (koordinátor)
- Projekt: RoboSoutěž 2026 – PWA pro úlohu Domino (pravidla, simulace bodování, návrhy rozložení)
- Aktuální verze: (viz `version.js`)
- Cíl aktuální etapy: první vydání 1.0.0 podle pravidel v `docs/rules/`, synchronizace s GitHubem `vlsam/domino`
- Naposledy aktualizováno: 2026-10-21

## Rozdělení souborů (kdo co vlastní)
| Agent | Soubory |
|---|---|
| Koordinátor (zároveň PWA agent) | `index.html`, `app.js`, `app.css`, `install.js`, `sw.js`, `manifest.webmanifest`, `version.js`, `icons/`, `.htaccess`, `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `CHANGELOG.md`, `STAV.md` (Souhrn) |
| Testovací agent | jen spouští testy a zapisuje svou sekci v `STAV.md`, kód neupravuje |

Proč PWA část nedělí víc agentů: aplikace je jeden souvislý celek (jeden skript simulace a bodování,
na který navazují sekce Pravidla a Návrhy). Rozdělení by vedlo ke společným souborům. Ověření dělá samostatný testovací agent.

## Hotovo
- Úvodní obrazovka: „RoboSoutěž 2026“, tlačítko Vstoupit, „Přidat na plochu“ (iOS návod), verze a datum z `version.js`.
- Sekce Pravidla, Simulace, Návrhy se spodní navigací.
- Service worker podle `sablony/pwa/sw.js`: cache s číslem verze, `skipWaiting` + `clients.claim`, ze sítě a při výpadku z cache.
- Data simulace v localStorage pod pevným klíčem `robosoutez-2026-data` s číslem verze dat (`dataVersion`).

## Zbývá
- Push na GitHub: zatím odmítnut (Claude nemá zápis do `vlsam/domino`), viz otázky.
- Nasazení (GitHub Pages nebo FTP): jen na pokyn uživatele; `pristupy/ftp.env` neexistuje.
- Polohu žlutého obdélníku (odměřeno z plánku ±5 mm) a tloušťku žluté čáry (odhad 20 mm) ověřit na skutečném hřišti.

## Otevřené otázky pro uživatele
- Povolit Claudovi zápis do repozitáře (aplikace Claude na GitHubu), nebo pushovat ručně?
- Hostovat přes GitHub Pages (`https://vlsam.github.io/domino/`), nebo FTP?

## Poznámky agentů
### PWA agent
- Data uživatele: uložení starší verze (klíče `domino-pwa-v*`, `robosoutez-2026-v1`) se nepřebírají; šlo o vývojové verze před 1.0.0.
- Offline: po první návštěvě běží celá aplikace z cache (žádné API se nevolá).
### DB agent
- Projekt databázi nepoužívá.
### Testovací agent
Test 2026-10-21, verze 1.0.0, Docker + Playwright (headless Chromium) proti `http://localhost:8080`.
- **Omezení prostředí:** Docker Hub (i mirrory gcr/ecr/ghcr/quay) je pro sandbox zakázaný, `nginx:alpine` nešlo stáhnout.
  Jako náhradu jsem lokálně sestavil základní obraz se značkou `nginx:alpine` (nginx 1.24 z Ubuntu + busybox, výchozí konfigurace
  bez hlaviček Cache-Control). `Dockerfile` a `docker-compose.yml` jsou beze změny. Na skutečném `nginx:alpine` je potřeba test zopakovat.
- **Prošlo (21/23 v prvním běhu):** úvod (nadpis, Vstoupit, „verze 1.0.0 · 21. 10. 2026“), spodní lišta Pravidla/Simulace/Návrhy, „v1.0.0“
  v horní liště, karta „Krok 4: modul D“ → Simulace, `#total` = 340, SW `ready`, cache `robosoutez-1.0.0`, offline se ukáže úvod i Simulace (340),
  konzole bez chyb (CSP, JS), v kontejneru není `pristupy/`, `.git/`, `*.env` ani `CAS.csv`.
- **Neprošlo napoprvé: aktualizace.** Po `sed` na 1.0.1 v kontejneru byla i po 3 obnoveních vidět 1.0.0 a cache `robosoutez-1.0.0`.
  Při opakování se 1.0.1 ukázala až asi po 45 s (3. obnovení), stará cache zmizela, data v `robosoutez-2026-data` zůstala.
  Příčina: `version.js` nemá Cache-Control, takže ho prohlížeč (i v `importScripts` ve SW) bere z HTTP cache podle heuristiky (Last-Modified).
- **Nález v `.htaccess` (Apache, netestováno):** blok `\.(css|js|png)$` s `max-age=604800` stojí za blokem s `no-cache`, a tak
  `version.js` (a `install.js`, `app.js`) dostane cache na týden. Aktualizace by na produkci mohla být vidět až po týdnu. Řeší koordinátor.
- **Nešlo ověřit:** `beforeinstallprompt` se v headless Chromium nespustil, `#installBtn` existuje, ale je skrytý. Instalace a návod pro iOS nebyly ověřeny.
- Poznámka: do kontejneru (a na web) se kopírují i `STAV.md`, `CLAUDE.md`, `docs/`, `sablony/`, `cas.ps1`, `dashboard.*` (žádná hesla, ale nejsou potřeba).
### Release agent
