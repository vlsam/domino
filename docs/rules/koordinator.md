# Koordinátor

**Koordinátor plánuje a ověřuje. Pracovní agenti vykonávají svůj díl.**

## Kdy dělit práci
- Jen u opravdu nezávislých částí (PWA vrstva, databáze, testy, release).
- Malé a triviální úlohy dělej jedním agentem.
- Maximálně 3–4 agenti současně.

## Role
- **Koordinátor** (hlavní agent): čte zadání, uvádí předpoklady, ptá se uživatele,
  rozdělí práci, zadá ji agentům, na konci výsledky spojí a ověří.
- **PWA agent**: manifest, service worker, tlačítko instalace, verze (`pwa.md`).
- **DB agent**: schéma a migrace (`databaze.md`). Migrace píše vždy jen jeden agent.
- **Testovací agent**: spouští Docker testy a hlásí výsledky, kód neupravuje (`docker-testy.md`).
- **Release agent**: GitHub a FTP, jen na pokyn uživatele (`github.md`, `ftp.md`).

## Před rozdělením
1. Přečti `STAV.md`. Pokud projekt už běží, navaž na něj.
2. Vyřeš nejasnosti s uživatelem. Pracovní agenti se uživatele neptají.
3. Definuj sdílená rozhraní (názvy, formáty dat, API, struktura souborů) dřív, než agenti začnou.
4. Přiděl každému agentovi vlastní soubory. Zapiš je do `STAV.md` (Rozdělení souborů).
   Dva agenti nikdy neupravují stejný soubor.
5. Ověř, že jsou k dispozici přístupy, které práce vyžaduje (`pristupy/`). Chybí-li, řekni to uživateli.

## Zadání agentovi musí obsahovat
- Co přesně dělá a co je kritérium úspěchu.
- Seznam souborů, které smí měnit.
- Výslovný pokyn, které soubory přečíst: `CLAUDE.md`, `STAV.md` a soubor jeho role z `docs/rules/`.
- Co nesmí (push, FTP, produkční DB bez pokynu).

## Spory a změny cizího souboru
Potřebuje-li agent změnit soubor jiného agenta, nahlásí to koordinátorovi.
Koordinátor rozhodne (předělá rozdělení, nebo změnu provede sám). Agent do cizího souboru nezasahuje.

## Závěrečná kontrola
1. Spojit díly, spustit celkové testy v Dockeru.
2. Projít `hotovo.md`.
3. Ukončit zapomenuté úseky času a spustit `.\cas.ps1 souhrn`; výkaz pro klienta `.\cas.ps1 vykaz` jen na požádání (viz `cas.md`).
4. Aktualizovat `STAV.md` (Souhrn, Hotovo, Zbývá).
5. Uživateli shrnout: co se udělalo, co se ověřilo, co ne, a kolik to zabralo času.
   Push a nasazení nabídnout, ale neprovádět bez pokynu.
