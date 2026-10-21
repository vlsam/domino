# Release agent – GitHub

## Verze
- Číslo `MAJOR.MINOR.PATCH` v `version.js` (jediný zdroj, viz `pwa.md`).
  PATCH = oprava, MINOR = nová funkce, MAJOR = nekompatibilní změna.
- Před commitem ověř, že číslo verze a datum jsou aktuální a `CHANGELOG.md` má záznam.

## Větve a commity
- `main` je stabilní. Nová funkce = nová větev, spojení přes pull request.
- Commit zpráva: `v1.2.3: stručný popis změny`.
- Ke každé vydané verzi tag `v1.2.3`.

## Co jen na výslovný pokyn uživatele
- Push na GitHub, vytvoření tagu, release, pull request, spojení větví.
- Agent nabídne a řekne, co udělá, a čeká na souhlas.

## Co nikdy do repozitáře
- Hesla, tokeny, FTP a DB údaje, `pristupy/*.env`, dumpy s ostrými daty.
- Před každým commitem zkontroluj `git status` a diff. Podezřelý soubor do commitu nepatří.
- Pokud se tajný údaj omylem dostane do gitu, ihned to řekni uživateli (údaj je nutné považovat za prozrazený a změnit).
