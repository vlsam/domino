# Měření času projektu

Cíl: u každého projektu vidět celkový čas a dílčí časy (po úkolech, agentech a dnech).
Nástroj: `cas.ps1` v kořeni projektu, data v `CAS.csv` (otevře se v Excelu).

## Pravidla pro agenty
1. **Na začátku úkolu** zapiš start, **na konci** stop. Čas bere skript z hodin počítače, agent ho nikdy nepíše ručně ani neodhaduje.

       .\cas.ps1 start "Tlačítko Přidat na plochu" pwa
       .\cas.ps1 stop pwa

2. Jméno agenta je stejné ve startu i stopu (`pwa`, `db`, `test`, `release`, výchozí `hlavni`). Souběžní agenti tak mají každý svůj úsek.
3. Popis úkolu je krátký a při návratu k téže práci stejný, aby se časy správně sečetly.
4. Úsek se vždy ukončí, i když práce skončí chybou nebo přerušením. Zapomenutý otevřený úsek koordinátor ukončí a uvede to v souhrnu.
5. Koordinátor na konci práce (a na požádání) spustí `.\cas.ps1 souhrn` a výsledek uvede uživateli.

## Co se měří
- **Čas projektu (skutečný)**: sjednocení všech úseků. Když dva agenti pracují naráz, překryv se nepočítá dvakrát.
- **Součet práce agentů**: prostý součet úseků všech agentů. Při paralelní práci je vyšší než skutečný čas.
- Souhrn dává i čas po úkolech, po agentech a po dnech.

## Výkaz pro klienta
Příkaz `.\cas.ps1 vykaz` vytvoří `VYKAZ.md` (a vypíše ho) ve tvaru:
- po agentech: každý úkol se začátkem, koncem (datum a čas) a dobou, mezisoučet agenta,
- souhrnná tabulka agentů,
- **celkový součet práce všech agentů** (h:mm:ss) a celkem hodin jako desetinné číslo pro fakturaci.

Výkaz počítá součet práce agentů, tedy i souběžnou práci naráz. Skutečnou dobu bez překryvu ukáže `souhrn`.
Koordinátor výkaz vytvoří na konci práce nebo na požádání. Úkoly proto pojmenovávej srozumitelně pro klienta,
protože se objeví ve výkazu. Otevřené úseky se do výkazu nezapočítají (výkaz na ně upozorní).

## Živý přehled (dashboard)
Příkaz `.\dashboard.ps1` spustí lokální stránku `http://localhost:8765/` a otevře ji v prohlížeči.
Zobrazí pruh každého agenta v čase, co právě dělá, log událostí a hodiny. Data bere z `CAS.csv`
(obnova každé 2 s), takže ho plní stejné `start` a `stop` jako měření času. Nespotřebuje žádné tokeny
a agenti pro něj nemusí nic dělat navíc. Ukončení: Ctrl+C. Server běží jen na localhostu a vydává
jen `dashboard.html` a `CAS.csv`.

Když systém zakazuje spouštění skriptů, použij:

    powershell -ExecutionPolicy Bypass -File .\dashboard.ps1

Přehled je jen tak přesný, jak agenti dodržují pravidlo 1 (start na začátku, stop na konci).

## Omezení
- Měří se čas mezi startem a stopem zapsaným agentem. Není to čas, kdy uživatel skutečně seděl u počítače. Čas strávený mimo práci agentů (vlastní úpravy, přemýšlení) je potřeba doplnit ručně do `CAS.csv` (řádek `zacatek;konec;minuty;agent;ukol`, agent např. `uzivatel`).
- Při práci mimo Claude (běžný editor) se nic neměří.
- `CAS.csv` je běžný soubor v projektu. Nejsou v něm žádné přístupy, takže může být v gitu.
