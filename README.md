# Šablona pravidel pro projekty

Tuto složku zkopíruj do nového projektu (obsah složky `pravidla/` do kořene projektu).

## Postup u nového projektu

1. Zkopíruj obsah této složky do kořene projektu.
2. Zkopíruj `sablony/pristupy/*.example` do `pristupy/` a přejmenuj bez `.example`
   (`ftp.env.example` → `ftp.env`, `db.env.example` → `db.env`). Vyplň jen to, co projekt potřebuje.
3. Pokud je projekt PWA, zkopíruj soubory ze `sablony/pwa/` do projektu.
4. Pokud testuješ v Dockeru, zkopíruj `sablony/docker/` do kořene projektu.
5. Zkontroluj, že `.gitignore` vylučuje `pristupy/*.env`.
6. Smaž sekce a soubory, které projekt nepotřebuje (např. `databaze.md` bez databáze).

## Struktura

```
CLAUDE.md                 jádro, čte každý agent
STAV.md                   stav práce, předávání mezi agenty a dny
CHANGELOG.md              historie verzí
version.js                jediný zdroj čísla verze a data
cas.ps1                   měření času (start / stop / souhrn)
dashboard.ps1, .html      živý přehled agentů z CAS.csv (http://localhost:8765/)
CAS.csv                   vzniká automaticky při prvním startu
.gitignore
pristupy/                 FTP a databáze (jen lokálně, mimo git)
  README.md
  ftp.env                 (vytvoříš ty)
  db.env                  (vytvoříš ty)
docs/rules/               pravidla po rolích
sablony/                  hotové šablony (pwa, docker, pristupy)
```
