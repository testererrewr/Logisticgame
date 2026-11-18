# Konzept: Autofähren und öffentliche Frachtlinien

Stand: Update 78. Öffentliche Frachtlinien sind spielbar. Autofähren bleiben ein Konzept.

## Spielstand von Update 78

Eine bestehende unbefristete Zug-, Schiffs- oder Fluglinie mit mindestens zwei eigenen Stationen und einem zugewiesenen Fahrzeug kann in den Liniendetails veröffentlicht werden. Der Betreiber setzt den Preis pro EH; die ladbaren Güter ergeben sich aus dem tatsächlichen Fahrzeug, Auflieger oder Zugverband. Die Oberfläche zeigt die derzeit buchbare Kapazität und die Fahrplanregel. Das eigene Gebäude direkt neben einer Station ist zunächst öffentlich. Der Betreiber kann es in den Liniendetails einzeln privat stellen; bestätigte Buchungen werden dadurch nicht gelöscht.

Kunden können an öffentlichen Stationen und direkt angrenzenden Gebäuden Ware abgeben oder sie per eigenem Fahrzeug beziehungsweise Nahumschlag dorthin bringen. Im Linienbereich oder direkt am öffentlichen Gebäude wählen sie Fahrzeug, Abfahrthalt, Ware und bis zu zehn Entladeziele. Auch Auftragsfracht mit eigener Charge kann gebucht werden. Der Server reserviert die Fahrzeugkapazität für jedes betroffene Teilstück und speichert beide Speditionen gemeinsam. Der Fahrpreis wird bei der Buchung vom Kunden reserviert und erst beim tatsächlichen Verladen dem Betreiber gutgeschrieben. Bis zur Verladung kann der Kunde stornieren; nach sieben Spieltagen ohne Verladung gibt das Spiel Ware und Fahrpreis automatisch zurück. Am Zielhalt landet die Fracht im Bestand des Kunden und kann weitertransportiert werden.

Die Kostenangabe in den Liniendetails ist derzeit eine Schätzung aus Fahrzeugbetrieb und Energie. Personal, Gebühren und tatsächliche Auslastung können den Wert verändern. Ein exakter künftiger Abfahrts- und Ankunftszeitpunkt für jeden Halt ist noch nicht berechnet; Fahrplanregel und laufende Fahrzeugankunft werden angezeigt. Buchungen auf einer Linie mit Fahrzeugausfall warten auf die Wiederaufnahme oder laufen nach sieben Spieltagen aus.

## 1. Autofähren

### Zweck und Zugang

Autofähren verbinden Straßennetze über kurze und mittlere Meerespassagen. Jede Spedition kann sie nutzen, auch ohne eigenen Hafen oder eigenes Schiff. Die erste Version nutzt neutrale Fähren der Spielwelt. Spielerfähren sind eine mögliche spätere Erweiterung. Große Ozeane bleiben eine Aufgabe für Frachtschiffe.

Nur veröffentlichte Hafenpaare sind nutzbar. Jeder Fährhafen hat einen öffentlichen Fahrzeugbereich. Private Gebäude oder Lager in der Nähe sind dafür nicht erforderlich und können eine Überfahrt nicht blockieren. Beide Richtungen haben eigene Fahrpläne und Kapazitäten.

### Einbindung in eine Fahrt

1. Die Straßenroutenplanung prüft Fahrwege mit und ohne Fähre. Sie vergleicht Fahrzeit, Wartezeit, Fahrpreis und Straßenkosten. Ein Schalter am Fahrzeug oder an der Linie erlaubt oder verbietet Fähren. Für einen konkreten Auftrag kann der Spieler die vorgeschlagene Verbindung vor Abfahrt sehen.
2. Das Fahrzeug fährt zum Abfahrtshafen. Sein Auftrag und seine Ladung bleiben unverändert. Am Hafen erhält es den Status „Wartet auf Fähre“ mit Abfahrt, Platz in der Warteschlange und erwarteter Ankunft.
3. Bei der Abfahrt wird das Fahrzeug an Bord genommen. Während der Überfahrt kann es keine andere Linie übernehmen, keine Ladung ausliefern und nicht an einen anderen Ort versetzt werden. Nach der Ankunft fährt es die geplante Straßenroute weiter.
4. Ein Rückweg kann dieselbe oder eine andere Fährverbindung nutzen. Das ist eine neue Buchung mit eigenem Fahrplan und Preis.

### Fahrplan und Kapazität

- Jede Verbindung hat feste Abfahrten, zum Beispiel alle sechs Spielweltstunden, eine Einschiffungszeit und eine Überfahrtsdauer. Die Simulation verarbeitet Abfahrten auch ohne angemeldete Spieler. Neben der Spielweltzeit steht die voraussichtliche echte Uhrzeit.
- Transporter und LKW können mit ihrer Ladung und einem angehängten Auflieger mitfahren. Ein Zug, Flugzeug oder Frachtschiff ist kein Fährfahrzeug.
- Die Fähre begrenzt gleichzeitig Stellfläche und Gesamtgewicht. Ein LKW mit Auflieger benötigt mehr Stellfläche als ein Transporter. Eine Reservierung belegt beides auf genau einer Abfahrt.
- Sind alle Plätze belegt, wird vor der Buchung die nächste freie Abfahrt angezeigt. Fahrzeuge ohne bestätigte Reservierung warten nach Eingangszeit. Das System darf keine zwei Fahrzeuge auf denselben letzten Platz buchen.

Ein Beispiel mit reinen Spielwerten: Eine Fähre fährt um 18:00 Spielweltzeit, braucht acht Spielweltstunden und hat 40 Stellplätze. Ein Transporter belegt einen Platz, ein Sattelzug zwei. Sind nur noch ein Platz und ausreichend Gewicht frei, wird dem Sattelzug automatisch die nächste Abfahrt angeboten. Die Ankunftsprognose enthält Anfahrt, Wartezeit, Einschiffung und Überfahrt.

Für jede Buchung gelten eindeutige Zustände: **zum Hafen unterwegs → reserviert oder wartend → an Bord → angekommen → Straßenfahrt fortgesetzt**. Nach einem Neustart oder einer Weltabrechnung muss derselbe Zustand wiederhergestellt werden. Ein zweiter Befehl mit derselben Buchungskennung darf keinen zweiten Platz oder eine zweite Abbuchung erzeugen.

### Preis, Fristen und Störungen

Vor der Bestätigung zeigt das Spiel Fahrpreis, Abfahrtszeit, erwartete Ankunft, Gesamtroute und die verbleibende Auftragsfrist. Der neutrale Preis setzt sich aus einer Grundgebühr, Entfernung, Fahrzeuggröße und Gewicht zusammen. Er wird bei der Einschiffung abgebucht; eine Reservierung allein kostet noch nichts. Bei einer abgesagten Fahrt entsteht keine Gebühr.

Wetter, Hafensperren oder Ausfälle verschieben die Abfahrt. Fahrzeug und Ladung bleiben am letzten sicheren Hafen. Das Spiel zeigt die neue Prognose und versucht die nächste passende Fahrt. Wird eine zugesagte Überfahrt endgültig gestrichen, kann der Spieler ohne Gebühr auf eine andere Verbindung wechseln oder die Straßenroute neu berechnen. Eine Fähre teleportiert nie Fahrzeuge und erfüllt keine Frachtaufträge selbst.

### Sichtbar im Spiel

- Auf der Karte: Fährstrecken, Häfen und nächste Abfahrt.
- In den Fahrzeugdetails: gebuchte Fähre, Wartestatus, Fahrpreis und erwartete Ankunft.
- In der Linienplanung: Fähren zulassen, konkrete Strecke und Gesamtkosten prüfen.
- Bei Verspätung: Nachricht mit neuer Ankunftszeit und Auswirkung auf die Lieferfrist.

## 2. Öffentliche Frachtlinien

Ein Spieler kann eine bestehende Schiffs-, Zug- oder Fluglinie für andere Speditionen öffnen. Fahrzeuge, Halte und Tarif bleiben beim Betreiber. Die Kunden liefern eigene Fracht an einen öffentlichen Halt und wählen dort die Linie. Eine Linie kann mehrere Halte haben.

### Was der Betreiber einstellt

Der Betreiber veröffentlicht die Linie, ihren Fahrplan und einen Preis pro EH. Er wählt **keine Frachtarten** und trägt keine freie Kapazität von Hand ein. Beides ergibt sich aus den tatsächlich eingesetzten Fahrzeugen und ihren Ausrüstungen, nach Abzug bereits eingeplanter eigener Ladung und bestätigter Fremdbuchungen. Bei einer Zuglinie kann daher die Abfahrt um 06:00 andere Güter aufnehmen als die Garnitur um 12:00. Kunden sehen für jede Abfahrt die passenden Frachtarten und freien EH. Eine Buchung wird beim Verladen nochmals gegen die reale Garnitur geprüft.

Das Spiel zeigt dem Betreiber die Kosten für 1 EH auf der Linie und auf jedem Abschnitt: Energie oder Treibstoff, Personal, Gebühren und Verschleiß. Der Betreiber setzt einen Verkaufspreis pro EH für die gesamte Strecke. Teilstrecken erhalten daraus vorab sichtbare Preise nach Streckenlänge und Kostenanteil. Eine spätere Preisänderung betrifft nur neue Buchungen.

Der Betreiber kann die Linie nur veröffentlichen, wenn ein Fahrzeug tatsächlich darauf fährt. Angekündigte Takte wie „alle sechs Stunden“ beruhen auf dem tatsächlichen Umlauf der Fahrzeuge. Verspätungen ändern die nächsten angezeigten Abfahrten und Ankünfte.

### Gebäude an den Halten

Geeignete Gebäude **direkt neben** einer öffentlichen Station werden automatisch für Frachtannahme, Lagerung und Abholung auf dieser Linie freigegeben. Dazu zählen insbesondere Frachtlager und Umschlagplätze. „Direkt neben“ bedeutet eine unmittelbar angrenzende Baufläche oder eine vorhandene kurze Terminalverbindung, keine beliebigen Betriebe im Umkreis. Ein später gebautes angrenzendes Gebäude wird ebenfalls zunächst öffentlich.

Der Betreiber kann jedes dieser Gebäude einzeln wieder auf **privat** stellen. Neue Fremdlieferungen und Buchungen sind dort dann gesperrt. Bereits eingelagerte fremde Fracht und bestätigte Transporte müssen bis zur Abholung zugänglich bleiben; erst danach greift die Sperre vollständig. „Öffentlich“ erlaubt nur Anlieferung, zugeordnete Lagerung und Abholung. Es gibt Kunden keine Bau-, Verkaufs- oder Verwaltungsrechte am Gebäude und keinen Zugriff auf die Fracht anderer Spieler.

### Ablauf für einen Kunden

1. Der Kunde bringt seine Fracht selbst in ein öffentliches Gebäude direkt neben dem Bahnhof, Hafen oder Flughafen. Alternativ liefert eine seiner eigenen anschließenden Linien sie dorthin. Das Lager führt die Bestände getrennt nach Eigentümer und Auftrag.
2. **Erst am Halt** wählt der Kunde eine öffentliche Linie und eine konkrete kommende Abfahrt. Die Anzeige zeigt die eingesetzte Garnitur oder das Fahrzeug, mögliche Frachtarten, freie Kapazität, Fahrpreis und Ankunft an jedem Halt.
3. Aus seiner dort vorhandenen Fracht wählt er Gut und Menge. Für jede Teilmenge legt er fest, an welcher späteren Station sie entladen wird. Beispiel: 300 EH Stahl werden in A geladen, 100 EH in B und 200 EH in C entladen.
4. Das Spiel prüft Frachtverträglichkeit und freie Kapazität auf **jedem** belegten Abschnitt. Nach Bestätigung sind die Plätze reserviert. Fracht, die noch unterwegs zum Halt ist, kann vorher nur als Vorschau betrachtet, aber noch nicht verbindlich gebucht werden.
5. Bei Abfahrt übernimmt die Linie genau die gebuchten Mengen. An Zwischenhalten bleibt die für spätere Halte bestimmte Fracht auf dem Fahrzeug. Am gewählten Zielhalt wird sie dem Kunden im dortigen öffentlichen Gebäude gutgeschrieben. Er kann sie abholen oder mit einer eigenen Linie weitertransportieren. Der ursprüngliche Auftrag ist erst nach Zustellung beim eigentlichen Abnehmer erfüllt.

Beispiel für wechselnde Garnituren: Um 06:00 fährt ein Kühlzug, um 12:00 ein Schüttgutzug. Hat der Kunde 300 EH Weizen am Bahnhof A eingelagert, zeigt ihm die Abfahrt um 06:00 keinen passenden Platz. Für die Abfahrt um 12:00 kann er 100 EH zur Station B und 200 EH zur Station C buchen, sofern auf A–B 300 EH und auf B–C noch 200 EH frei sind. Die Buchungsübersicht zeigt beide Teilpreise und die jeweilige Ankunft.

### Abrechnung und Schutz vor Fehlern

- Der Kunde sieht vor der Buchung den Preis für jede Teilmenge und alle Zielhalte. Der Fahrpreis wird bei der Buchung reserviert. Der Betreiber erhält ihn erst beim Verladen; bei Stornierung oder Ablauf erhält der Kunde Ware und Fahrpreis zurück.
- Bestätigte Buchungen belegen Kapazität auf allen betroffenen Abschnitten. Eigene geplante Fracht ist vorher bereits berücksichtigt. Die verfügbare Menge wird nicht doppelt verkauft.
- Ändert der Betreiber die Garnitur, darf eine bestätigte Buchung nicht stillschweigend unverladbar werden. Das Spiel muss eine passende Folgeabfahrt anbieten oder die Buchung lösen und die Fracht am Ausgangshalt belassen.
- Fällt ein Fahrzeug aus, bleibt jede Ladung einem Spieler und einem Halt zugeordnet. Eine Neubuchung oder Rückerstattung ist sichtbar. Eine Linie mit fremder Fracht an Bord oder offenen Buchungen kann nicht sofort gelöscht oder privat gestellt werden.
- Verkauf, Lagerung und Auftragserfüllung werden getrennt gebucht, damit weder Betreiber noch Kunde denselben Transport doppelt vergütet bekommen.

## Weitere Ausbauschritte

1. Für öffentliche Linien genaue Kosten pro EH einschließlich Personal und Gebühren sowie eine belastbare Ankunftsprognose für jeden Halt anzeigen.
2. Bei einem länger ausgefallenen Fahrzeug aktiv eine andere passende Abfahrt anbieten.
3. Neutrale Autofähren mit ausgewählten Hafenpaaren, Fahrplan, Kapazität und Einbindung in Straßenrouten bauen.
4. Spielerbetriebene Autofähren erwägen, falls der neutrale Dienst im Spiel gut funktioniert.
