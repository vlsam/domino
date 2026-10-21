# Docker – testování

Hotové šablony: `sablony/docker/` (`Dockerfile`, `docker-compose.yml`).

## Pravidla
- Testuje se v kontejneru, ne přímo na počítači: `docker compose up --build`.
- Testovací kontejner neobsahuje produkční přístupy. Do kontejneru se `pristupy/*.env` nekopírují.
- Služba `db` se přidává jen tehdy, když projekt databázi potřebuje. Migrace z `migrations/` se spouštějí při startu.
- Testovací agent jen spouští a hlásí výsledky, zdrojový kód sám neupravuje.

## Co ověřit
1. Aplikace se načte na `http://localhost:8080`.
2. Zobrazuje se číslo verze a datum.
3. Tlačítko „Přidat na plochu“ je k dispozici (v prohlížeči, který instalaci podporuje).
4. Po změně `version.js` a obnovení se načte nová verze a data zůstala.
5. Offline chování podle `pwa.md`.
6. Migrace proběhnou na prázdné databázi (pokud je databáze).

## Postup vydání
**Test v Dockeru → commit a tag na GitHub → (na pokyn) nasazení na FTP.**
Pokud Docker není k dispozici, řekni to uživateli a nepředstírej, že test proběhl.

## Hlášení
Testovací agent vrátí: co spustil, co prošlo, co ne, přesný text chyb a co nešlo ověřit.
