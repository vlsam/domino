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
### Release agent
