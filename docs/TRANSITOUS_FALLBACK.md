# Transitous als kostenfreier Fallback

Transitous stellt eine versionierte MOTIS-2-API unter `https://api.transitous.org/api/` bereit. Für die Routenplanung erfolgt die Anfrage über `GET /api/v6/plan` mit Koordinaten im Format `latitude,longitude` für `fromPlace` und `toPlace`.

Die Fallbackanfrage verwendet `minTransferTime` für die gespeicherte Mindestumsteigezeit, `preTransitModes=WALK`, `postTransitModes=WALK`, `transitModes=TRANSIT` und keine direkten Fußverbindungen. Damit ausschließlich überprüfte ÖPNV-Routen in Betracht kommen. Die API unterstützt außerdem zeitbezogene Routen und `maxTransfers`.

Eine am 22. August 2026 geprüfte Berliner Beispielabfrage gab unter `itineraries` zeitlich belegte Routen mit `startTime`, `endTime`, `transfers` und `legs` zurück. Jeder Abschnitt enthält `mode`, `duration`, `startTime`, `endTime`, `from` und `to`; reine Fußwege tragen `mode: WALK`, während Fahrzeugabschnitte einen anderen Modus sowie Linien-/Fahrtdaten enthalten. Die Fallback-Zuordnung erzeugt ausschließlich aus solchen Nicht-Fußweg-Abschnitten bestätigte Transitdaten.

Die öffentliche Instanz gilt als Best-Effort-Angebot für freie/Open-Source- und nichtkommerzielle Aktivitäten. Ein aussagekräftiger `User-Agent` mit Projektname und Kontaktinformation sowie ein sichtbarer Verweis auf die Transitous-Datenquellen sind erforderlich. Für kommerzielle oder lastintensive Nutzung erfolgt kein automatischer Fallback auf die öffentliche Instanz.

## Quellen

- [Transitous API und Nutzungsrichtlinie](https://transitous.org/api/)
- [MOTIS OpenAPI-Spezifikation](https://raw.githubusercontent.com/motis-project/motis/refs/tags/v2.10.2/openapi.yaml)
