# docs/rules – pravidla po rolích

| Soubor | Pro koho | Obsah |
|---|---|---|
| `koordinator.md` | koordinátor | rozdělení práce, zadání agentům, spory, limity |
| `cas.md` | všichni agenti | měření času projektu (`cas.ps1`) |
| `hotovo.md` | koordinátor, release | definice „hotovo“ (checklist) |
| `pwa.md` | PWA agent | instalace, aktualizace, offline, verze |
| `databaze.md` | DB agent | přístup, migrace, produkce |
| `docker-testy.md` | testovací a DB agent | testování v kontejneru |
| `github.md` | release agent | verze, větve, tagy, commity |
| `ftp.md` | release agent | nasazení, záloha, návrat zpět |

Bezpečnostní minimum je v kořenovém `CLAUDE.md` a platí vždy, i když agent tyto soubory nečte.
Číslo verze a datum jsou popsané jen v `pwa.md` a uložené v `version.js`. Jinde se neduplikují.
