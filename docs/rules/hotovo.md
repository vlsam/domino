# Definice „hotovo“

Práce je hotová, až když platí všechno z tohoto seznamu. Co neplatí, uveď v závěrečném shrnutí.

## Kód
- [ ] Kritérium úspěchu ze zadání je splněno a ověřeno.
- [ ] Testy prošly v Dockeru (`docs/rules/docker-testy.md`).
- [ ] Diff obsahuje jen změny související se zadáním.
- [ ] Žádné hesla, tokeny, FTP ani DB údaje v kódu ani v diffu.

## Verze
- [ ] `version.js`: číslo verze a datum jsou aktuální.
- [ ] `CHANGELOG.md` má nový záznam.
- [ ] Verze i datum jsou vidět v aplikaci.

## PWA (pokud je projekt PWA)
- [ ] Tlačítko „Přidat na plochu“ funguje (nebo se na iOS ukáže návod).
- [ ] Po restartu aplikace se načte nová verze.
- [ ] Data uživatele po aktualizaci zůstala.
- [ ] Aplikace se při výpadku internetu chová podle `pwa.md`.

## Předání
- [ ] `STAV.md` je aktuální.
- [ ] Všechny úseky v `CAS.csv` jsou ukončené a uživatel dostal výstup `.\cas.ps1 souhrn`.
- [ ] Uživatel ví, co zbývá a co je potřeba rozhodnout.
- [ ] Push na GitHub a nasazení na FTP proběhly jen na výslovný pokyn.
