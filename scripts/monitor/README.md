# Request-Monitoring auf dem Raspberry Pi

Schreibt die Produktions-Logs von fungio.de mit, um zu sehen, was die Vercel-Funktion (und damit das
CPU-Kontingent des Hobby-Plans) beansprucht: Seiten-Renders vs. Bild-Proxy, Bots vs. Menschen.

Grundlage ist `server/plugins/request-log.ts`: pro Funktionsaufruf genau eine JSON-Logzeile
(`kind`: `page` / `img` / `api` / `internal`, `bot`, gekürzter User-Agent, Status, Dauer in ms).
Was aus dem CDN-Cache kommt oder von der Firewall geblockt wird, erreicht die Funktion nicht und
taucht hier nicht auf — genau das, was keine CPU kostet.

## Einrichtung

1. Node + Vercel CLI: `node -v` (≥ 18), dann `sudo npm i -g vercel@latest` (≥ 62, wegen `vercel logs --follow`)
2. Vercel-Token anlegen: vercel.com → Account Settings → Tokens, Scope „JS's projects“, Ablauf z. B. 30 Tage.
   Auf dem Pi ablegen:
   `mkdir -p ~/.config/fungio-monitor && nano ~/.config/fungio-monitor/token && chmod 600 ~/.config/fungio-monitor/token`
3. Skripte kopieren (vom Mac aus, im Repo):
   `scp -r scripts/monitor pi@<pi-host>:~/fungio-monitor`
4. Als Dienst starten (läuft auch nach Neustart, ohne Login):
   ```
   mkdir -p ~/.config/systemd/user
   cp ~/fungio-monitor/fungio-monitor.service ~/.config/systemd/user/
   systemctl --user daemon-reload
   systemctl --user enable --now fungio-monitor
   sudo loginctl enable-linger $USER
   ```

## Nutzung

- Läuft er? `systemctl --user status fungio-monitor`, Fehler in `~/fungio-logs/collect-errors.log`
- Tagesauswertung: `python3 ~/fungio-monitor/summary.py` (heute) oder `… summary.py 2026-10-08`
- Datenmenge: ~300 Byte pro Anfrage, also selbst bei 20.000 Bot-Anfragen/Tag nur ~6 MB.

`collect.sh` nutzt `vercel logs --follow`: Das streamt neue Zeilen live, ohne Wiederholungen. Ohne
`--follow` zeigt die CLI (ab v62) nur die letzten Einträge und beendet sich — in einer Schleife gab das
alle ~25 s dieselben Zeilen erneut (gemessen auf dem Pi: 1.455 Zeilen, davon nur 44 verschiedene).
Endet der Stream doch einmal, startet die Schleife ihn neu und vermerkt das in `collect-errors.log`.
