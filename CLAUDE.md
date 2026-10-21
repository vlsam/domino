# CLAUDE.md – jádro (čte každý agent)

Zásady chování, které omezují typické chyby LLM při programování.
Detailní pravidla jsou v `docs/rules/` a čte je jen ten, koho se týkají (viz tabulka).

**Kompromis:** Zásady upřednostňují opatrnost před rychlostí. U triviálních úloh použij úsudek.

## Kde co najdeš (nehledej jinde)

| Co | Kde |
|---|---|
| Aktuální stav práce, co zbývá, otevřené otázky | `STAV.md` |
| Přístupy k FTP a databázi (doplňuje uživatel) | `pristupy/ftp.env`, `pristupy/db.env` |
| Jediný zdroj čísla verze a data | `version.js` |
| Historie verzí | `CHANGELOG.md` |
| Čas stráveno na projektu | `CAS.csv`, souhrn: `.\cas.ps1 souhrn`, výkaz pro klienta: `.\cas.ps1 vykaz` |
| Živý přehled agentů (pruhy, log, hodiny) | `.\dashboard.ps1` → `http://localhost:8765/` |
| Detailní pravidla po rolích | `docs/rules/` |
| Šablony (PWA, Docker, přístupy) | `sablony/` |

## Kdo čte co

Každý agent čte tento soubor + `STAV.md` + `docs/rules/cas.md`. Navíc:

| Role | Čte navíc |
|---|---|
| Koordinátor | `docs/rules/koordinator.md`, `docs/rules/hotovo.md` |
| PWA agent | `docs/rules/pwa.md` |
| DB agent | `docs/rules/databaze.md`, `docs/rules/docker-testy.md` |
| Testovací agent | `docs/rules/docker-testy.md` |
| Release agent (GitHub, FTP) | `docs/rules/github.md`, `docs/rules/ftp.md`, `docs/rules/hotovo.md` |

Koordinátor v zadání každému agentovi výslovně napíše, které soubory má přečíst.
Odkaz v textu soubor sám nenačte.

## Bezpečnostní minimum (platí pro všechny, vždy)

- Hesla, tokeny a přístupy nikdy do gitu, chatu, logů ani kódu. Žijí jen v `pristupy/`.
- Bez výslovného pokynu uživatele: žádný push na GitHub, žádné nasazení na FTP,
  žádný zápis do produkční databáze.
- Pokud přístup chybí nebo je prázdný, neimprovizuj. Řekni to uživateli.
- Testuje se v Dockeru, nikdy proti produkci.

## 1. Přemýšlej, než začneš kódovat

**Nedomýšlej si. Neskrývej nejasnosti. Upozorni na kompromisy.**

- Výslovně uveď své předpoklady. Pokud si nejsi jistý, zeptej se
  (pracovní agent koordinátora, koordinátor uživatele).
- Pokud existuje více výkladů, předlož je – nevybírej mlčky jeden.
- Pokud existuje jednodušší přístup, řekni to. Když je to namístě, oponuj.
- Pokud je něco nejasné, zastav se a pojmenuj, co je nejasné.

## 2. Nejdřív jednoduchost

**Minimum kódu, které problém řeší. Nic spekulativního.**

- Žádné funkce navíc oproti zadání.
- Žádné abstrakce pro jednorázový kód.
- Žádná „flexibilita“ ani „konfigurovatelnost“, o kterou nikdo nežádal.
- Žádné ošetření chyb pro nemožné scénáře.
- Nepřidávej knihovnu, když to jde bez ní.
- Pokud napíšeš 200 řádků a šlo by to na 50, přepiš to.

Otázka: „Řekl by senior inženýr, že je to přehnaně složité?“ Pokud ano, zjednoduš to.

## 3. Chirurgické změny

**Dotkni se jen toho, čeho musíš. Uklízej jen vlastní nepořádek.**

- „Nevylepšuj“ okolní kód, komentáře ani formátování.
- Nerefaktoruj věci, které nejsou rozbité.
- Dodržuj stávající styl.
- Nesouvisející mrtvý kód zmiň, nemaž ho.
- Odstraň jen to, co se stalo nepoužívaným kvůli TVÝM změnám.

Test: Každý změněný řádek musí jít vysledovat k požadavku uživatele.
Každý změněný soubor patří do dílu právě jednoho agenta.

## 4. Provádění řízené cílem

**Definuj kritéria úspěchu. Opakuj, dokud to není ověřeno.**

- „Přidej validaci“ → „Napiš testy pro neplatné vstupy, pak je zprovozni“
- „Oprav chybu“ → „Napiš test, který ji reprodukuje, pak ho zprovozni“
- „Refaktoruj X“ → „Zajisti, že testy projdou před i po změně“

U vícekrokových úloh uveď plán:
1. [Krok] → ověření: [kontrola]
2. [Krok] → ověření: [kontrola]

## 5. Konec práce agenta

Každý agent na konci zapíše do `STAV.md` (jen svou sekci) a vrátí koordinátorovi:
co změnil, jak to ověřil, jaké předpoklady použil, co zůstalo nevyřešené.
Komunikace a komentáře česky, názvy v kódu anglicky.

## 6. Měření času

Každý agent zapisuje čas svých úseků přes `cas.ps1` (start na začátku úkolu, stop na konci).
Čas nikdy neodhaduj ani nepiš ručně. Podrobnosti: `docs/rules/cas.md`.

## 7. Dělení práce na agenty (povinné posouzení)

Uživatel tímto pokynem výslovně povoluje spouštět pracovní agenty bez dalšího dotazu.

Jakmile úkol zasahuje do víc než jedné role z tabulky „Kdo čte co“ (PWA, DB, testy, release)
nebo bude mít víc než ~10 nových souborů, koordinátor **před začátkem práce**:

1. Napíše uživateli krátký plán dělení: které části jsou nezávislé, který agent má které soubory.
2. Zapíše rozdělení do `STAV.md` (sekce „Rozdělení souborů“) a každému agentovi dá v zadání
   seznam souborů, které smí měnit, a které `docs/rules/*.md` má přečíst.
3. Pustí nezávislé části souběžně (max. 3–4 agenti). Sdílená rozhraní (názvy tabulek, formát dat,
   adresy) určí dřív, než agenti začnou.
4. Ověření dělá **jiný** agent než autor: testovací agent spouští testy v Dockeru a kód neupravuje.

Dělit se nemusí jen tehdy, když je úkol malý nebo je souvislý celek, kde jedna část
nejde dělat bez druhé. Pak koordinátor **výslovně napíše proč** a zapíše to do `STAV.md`.
Mlčky všechno dělat jedním agentem je porušení pravidla.

Koordinátor nikdy neoznačí svůj výstup jako ověřený, dokud ho neověřil jiný agent
(nebo nenapíše, že nezávislé ověření proběhlo jen v omezené podobě, a proč).

---

**Zásady fungují, pokud:** diffy mají méně zbytečných změn, méně přepisů kvůli
přílišné složitosti, upřesňující otázky přicházejí před implementací
a agenti se nepřekrývají v souborech.
