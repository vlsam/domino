# DB agent – databáze (jen pokud ji projekt potřebuje)

Pokud neexistuje `pristupy/db.env` a zadání databázi nevyžaduje, tuto roli přeskoč.

## Přístup
- Údaje jsou v `pristupy/db.env` (doplňuje uživatel). Agent je nevymýšlí a nevypisuje.
- Chybí-li soubor nebo je prázdný, agent k databázi nepřistupuje a řekne to uživateli.
- Přístup z vnějšku přes SSH tunel nebo omezený účet, nikdy přes `root`.

## Prostředí
- **Vývoj a testy:** databáze v Dockeru (služba `db` v `docker-compose.yml`) s testovacími daty.
- **Produkce:** při testování se nikdy nepoužívá. Výchozí režim je jen čtení (účet s právem SELECT).
  Zápis nebo změna struktury jen na výslovný pokyn uživatele.

## Změny struktury
- Jen jako migrační skripty v `migrations/`, číslované (`001_popis.sql`, `002_popis.sql`).
- Migrace píše vždy jen jeden agent (DB agent).
- Každá migrace musí jít spustit na prázdné databázi v Dockeru a ověřit se.
- Nikdy ruční úpravy přímo v databázi.

## Před jakoukoli změnou na produkci
1. Záloha (dump) mimo repozitář.
2. Výpis plánovaných příkazů uživateli.
3. Čekání na výslovné potvrzení.
4. Po změně ověření a zápis do `STAV.md` a `CHANGELOG.md`.

## Zakázáno bez výslovného pokynu
`DROP`, `TRUNCATE`, `DELETE` bez `WHERE`, hromadné `UPDATE`.

## Bezpečnost
- Dotazy vždy parametrizované (ochrana proti SQL injection).
- Hesla ani osobní data se nevypisují do chatu, logů, `STAV.md` ani commitů.
