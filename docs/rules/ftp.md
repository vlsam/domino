# Release agent – FTP nasazení

## Přístup
- Údaje jsou v `pristupy/ftp.env` (doplňuje uživatel). Agent je nevymýšlí, nevypisuje a neptá se na heslo v chatu.
- Chybí-li soubor nebo je prázdný, agent nenasazuje a řekne to uživateli.
- Preferuj SFTP nebo FTPS (`FTP_PROTOCOL`). Čisté FTP posílá heslo nešifrovaně, na to uživatele upozorni.

## Podmínky nasazení
Nasazuje se jen když platí vše:
1. Uživatel o nasazení výslovně požádal.
2. Testy v Dockeru prošly a `hotovo.md` je splněno.
3. Verze je zapsaná v GitHubu (tag) a v `CHANGELOG.md`.

## Postup
1. Vypiš uživateli, které soubory se nahrají a kam (`FTP_REMOTE_DIR`). Nenahrávej `pristupy/`, `.git`, `docs/`, `sablony/`, `STAV.md`, `migrations/` s dumpy.
2. **Záloha:** stáhni nebo přejmenuj stávající verzi na serveru před přepsáním.
3. Nahraj soubory.
4. Zkontroluj nasazenou aplikaci na `APP_URL`: načte se a ukazuje novou verzi a datum.
5. Zapiš do `STAV.md`: verze, datum, co se nasadilo.

## Návrat zpět (rollback)
- Pokud kontrola selže, obnov zálohu a řekni to uživateli.
- Předchozí verzi lze znovu nasadit z odpovídajícího git tagu.
