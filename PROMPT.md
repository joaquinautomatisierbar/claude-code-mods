# Deine eigenen Claude-Code-Mods: der Prompt

Kopiere den Text unten in die Claude-App (Code-Tab, Desktop-App). Claude liest deine alten Chats, findet deine nervigsten Wiederholungen und baut dir die passenden Mods.

Voraussetzung: aktuelle Claude-Desktop-App mit Code-Tab. Du musst nicht programmieren können.

---

```
Ich möchte mir Claude-Code-Mods bauen, die zu MEINER Arbeit passen.

1. Lies meine bisherigen Claude-Code-Chats. Sie liegen lokal unter
   ~/.claude/projects/ als .jsonl-Dateien. Nimm nur meine eigenen Nachrichten
   und welche Werkzeuge du am häufigsten benutzt hast.

2. Such Muster:
   - Sätze oder Bitten, die ich immer wieder schreibe
   - Fragen, die ich oft stelle („wie weit bist du?“, „ist X bereit?“)
   - Situationen, in denen ich dich korrigieren musste, weil etwas fehlte
   - Dinge, die oft schiefgehen (voller Chat, fehlende Dateien, Abbrüche)
   Zähle sie, damit wir echte Zahlen haben.

3. Schlag mir die 5 Mods vor, die mir am meisten Zeit oder Nerven sparen.
   Pro Mod: was er macht, wo er erscheint (Anzeige über dem Eingabefeld,
   Statuszeile, Seitenpanel, Befehl mit /, Warnung vor einer Aktion),
   und welche Zeile aus meinen Chats ihn begründet (mit Anzahl).

4. Warte, bis ich ausgewählt habe. Dann bau die Mods einzeln, teste jeden,
   und sag mir, wie ich ihn ein- und ausschalte.

Wichtig: Schick nichts aus meinen Chats ins Internet. Alles bleibt auf meinem Rechner.
```

---

## Meine 5 Mods als Vorlage

Im Ordner `joaquins-mods/` liegen meine fünf Mods. Zum Übernehmen: Ordner entpacken, in die Claude-App ziehen und schreiben:

> Richte diese Mods für mich ein und pass sie an meinen Rechner an (z. B. die Namen meiner Festplatten und meinen OBS-Pfad).

| Mod | Was er macht |
|---|---|
| Kontext-Wächter | Ab 70 % vollem Chat ein Knopf „Übergabe schreiben“, damit nichts vergessen wird |
| Video-Fahrplan | Zeigt, wo dein Projekt steht, mit Knopf für den nächsten Schritt (`/fahrplan <Name>`) |
| Render-Monitor | Seitenpanel mit laufenden Renders, Nachricht wenn fertig (`/renders`) |
| Dreh-Check | `/drehbereit` prüft OBS, Aufnahmepfad und Speicherplatz |
| Platten-Wächter | Zeigt, ob deine externen Platten dran sind, und stoppt Claude, wenn eine fehlt |
