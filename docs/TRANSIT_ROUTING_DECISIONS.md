# Transitverbindungen: bestätigte Daten und Umsteigepuffer

Der Reiseplaner darf eine Bahn- oder Busverbindung nur als **Direktverbindung** ausgeben, wenn die Transitantwort mindestens einen zeitlich belegten Transportabschnitt enthält. Bei leeren, fehlerhaften oder ausschließlich fußläufigen Antworten erfolgt keine geschätzte Bahn- oder Busverbindung. Die Oberfläche zeigt in diesem Fall eine nicht bestätigte Verbindung an.

Für die Routensuche erfolgen Start und Ziel über Koordinaten statt über nur die jeweils nächstgelegene Haltestelle. Die Transit-API kann damit Fußwege zu erreichbaren Haltestellen berücksichtigen und Bus, Tram, S-Bahn sowie Regionalverkehr anhand der tatsächlichen Gesamtzeit bewerten. Die schnellste bestätigte Verbindung nach Ankunftszeit erhält Vorrang.

Die je Reise konfigurierbare Mindestumsteigezeit fließt als `transferTime` in die Verbindungssuche ein. Als Standardwert gelten fünf Minuten. Eine Änderung löst für vorhandene Transitsegmente eine Neuberechnung aus.

## Quelle

Die DB Transport REST API beschreibt koordinatenbasierte `from`- und `to`-Eingaben für `GET /journeys`, Fußwege zu nahegelegenen Haltestellen über `startWithWalking` und den Parameter `transferTime` für eine Mindestumsteigezeit. [API-Dokumentation](https://v6.db.transport.rest/api.html)
