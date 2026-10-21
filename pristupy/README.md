# pristupy/ – jediné místo pro přístupy

Sem u každého projektu ručně doplníš přístupy. Agenti hledají přístupy **jen tady**.

| Soubor | Obsah | V gitu? |
|---|---|---|
| `ftp.env` | FTP/SFTP nasazení | ne |
| `db.env` | databáze (jen pokud ji projekt potřebuje) | ne |
| `*.env.example` | prázdné šablony | ano |

## Jak na to
1. Zkopíruj `sablony/pristupy/ftp.env.example` jako `pristupy/ftp.env` a vyplň.
2. Totéž pro `db.env`, pokud projekt databázi používá.
3. Nepotřebný soubor prostě nevytvářej. Agent pak ví, že daný přístup nemá.

## Pravidla pro agenty
- Soubory `*.env` agent čte jen pro konkrétní úkol (nasazení, DB migrace) a obsah nikdy nevypisuje.
- Chybí-li soubor nebo je prázdný, agent se k FTP/databázi nepřipojí a řekne to uživateli.
- Žádné kopie přístupů do jiných souborů, kódu, STAV.md ani commitů.
- Produkční databáze: účet jen pro čtení, pokud uživatel neurčí jinak.
