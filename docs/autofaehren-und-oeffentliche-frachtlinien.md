# Konzept: Autofähren und öffentliche Frachtlinien

Stand: Update 76. Dieses Dokument beschreibt Spielregeln und Bedienung. Beide Systeme sind noch nicht eingebaut.

## Autofähren

Autofähren sind zunächst ein neutraler Dienst der Spielwelt. Alle Spieler können ihre Straßentransporter und LKW darauf buchen. Eine Fähre verbindet zwei geeignete Fährhäfen; sie ersetzt keinen eigenen Hafen und fährt nur auf veröffentlichten Verbindungen. Lange Ozeanstrecken bleiben Schiffsfracht.

1. Bei der Routenplanung darf ein Fahrzeug eine Fährverbindung als Teil seines Wegs nutzen. Angezeigt werden Abfahrt, Wartezeit, Überfahrtsdauer, Ankunft, Preis und freie Plätze.
2. Das Fahrzeug fährt zuerst zum Fährhafen, wartet dort auf die nächste Abfahrt, fährt als Passagier mit und setzt am Zielhafen seine ursprüngliche Tour fort. Ladung, Auftrag und Fahrzeug bleiben beim Spieler.
3. Kapazität richtet sich nach Fahrzeugplätzen und Gewicht. Voll beladene Fähren lassen das Fahrzeug auf die nächste Fahrt warten. Der Fahrplan läuft in Spielweltzeit; die Oberfläche zeigt zusätzlich die voraussichtliche echte Uhrzeit.
4. Der Preis besteht aus Fahrzeuggebühr und einem Zuschlag für Länge oder Gewicht. Er wird vor der Buchung angezeigt und bei Abfahrt fällig. Kann die Fähre nicht fahren, erhält der Spieler eine neue Ankunftszeit oder kann die Buchung ohne Gebühr lösen.
5. Für die erste Version genügen feste Verbindungen mit festen Fahrplänen. Später können Spieler eigene Autofähren betreiben, wenn die neutrale Grundversorgung funktioniert.

## Öffentliche Frachtlinien

Ein Spieler kann eine bestehende Linie mit Schiff, Zug oder Flugzeug als **öffentlich** markieren. Die Fahrzeuge und der Fahrplan bleiben unter seiner Kontrolle. Andere Spieler buchen freie Frachtkapazität zwischen zwei Halten derselben Linie. Eine Linie darf mehr als zwei Halte besitzen.

### Veröffentlichung durch den Betreiber

- Der Betreiber legt Halte, Reihenfolge und Takt fest, zum Beispiel alle sechs Spielweltstunden. Die Oberfläche zeigt die nächsten tatsächlichen Abfahrten und Ankünfte auch in echter Uhrzeit.
- Er wählt die Frachtarten, die freie Kapazität und welche eigenen Gebäude an jedem Halt als Anlieferung, Lager und Abholung freigegeben sind. Ein Gebäude in der Nähe wird nicht automatisch öffentlich. Freigaben gelten einzeln für jedes Gebäude und können entzogen werden, sobald vorhandene Buchungen abgewickelt sind.
- Das Spiel zeigt die geschätzten Kosten für 1 EH je Abschnitt und für die ganze Linie: Energie oder Treibstoff, Personal, Gebühren und Fahrzeugverschleiß. Der Betreiber setzt den Preis pro EH für die ganze Linie. Für Teilstrecken wird daraus ein vorher sichtbarer Anteil berechnet.
- Die veröffentlichte Linie zeigt verfügbaren Platz je Fahrt. Eigene Fracht und bereits bestätigte Buchungen belegen Kapazität. Eine veröffentlichte Linie ohne aktive Fahrzeuge nimmt keine Buchungen an.

### Buchung durch einen Kunden

1. Der Kunde wählt Fracht, Menge, Einstiegsgebäude und Ausstiegsgebäude. Beide Gebäude müssen für diese öffentliche Linie freigegeben sein und an passenden Halten liegen.
2. Er liefert die Fracht selbst zum freigegebenen Lager oder Umschlagplatz. Bis zur Übernahme gehört sie ihm und wird ihm dort separat zugeordnet.
3. Bei Abfahrt übernimmt die Linie nur die gebuchte Menge. An Zwischenhalten bleibt sie auf dem Fahrzeug, sofern dort keine Entladung gebucht ist. Der Kunde kann für verschiedene Mengen derselben Ladung unterschiedliche Ausstiegshalte festlegen.
4. Am Ausstiegshalt wird die Fracht dem Kunden im freigegebenen Gebäude gutgeschrieben. Er kann sie abholen oder mit einer eigenen Anschlusslinie weitertransportieren. Der ursprüngliche Auftrag zählt erst nach Zustellung an dessen eigentlichen Abnehmer als erfüllt.
5. Vor Bestätigung sieht der Kunde den nächsten freien Transport, geplante Ankunft, Gesamtpreis und die verbleibende Auftragsfrist. Reicht die Frist nicht, erscheint eine deutliche Warnung.

### Abrechnung und Ausfälle

- Der Betreiber erhält den Fahrpreis für tatsächlich beförderte EH. Gebühren für Be und Entladung werden getrennt ausgewiesen. Leere oder abgesagte Fahrten erzeugen keinen Erlös.
- Der Preis einer bestätigten Buchung bleibt fest, auch wenn der Betreiber den Tarif später ändert. Neue Preise gelten nur für neue Buchungen.
- Fällt ein Fahrzeug aus, bleibt die Ladung eindeutig einem Spieler zugeordnet. Das System bietet die nächste passende Fahrt an oder gibt Fracht und Fahrpreis am letzten sicheren Halt zurück. Der Betreiber kann eine Linie mit offenen Buchungen nicht sofort löschen.
- Plätze werden bei Buchung reserviert, damit mehrere Spieler nicht dieselbe Kapazität erhalten. Eigene Fracht und fremde Fracht brauchen eine klare Priorität, die der Betreiber beim Veröffentlichen festlegt.

## Sinnvolle Reihenfolge für eine spätere Umsetzung

1. Neutrale Autofähren mit festen Häfen und Fahrplänen.
2. Öffentliche Linien nur zwischen zwei Halten, mit einem freigegebenen Gebäude je Halt.
3. Mehrere Halte, Teilstrecken und getrennte Entladeziele.
4. Eigene Autofähren und erweiterte Tarifregeln.
