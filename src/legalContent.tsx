// @ts-nocheck
/* Legal page content (German). Each entry: { title, render(company) }.
   Company data (Esmee Mocca, Einzelunternehmen) lives in Legal.tsx COMPANY.
   NOTE: have the texts reviewed by a lawyer before launch; confirm whether the
   BZSt number should be public and whether a USt-IdNr applies. */
import React from "react";

const STAND = "Stand: Juni 2026";

export const PAGES = {
  impressum: {
    title: "Impressum",
    render: (c) => (
      <>
        <h2>Angaben gemäß § 5 DDG</h2>
        <p>
          {c.name} – {c.form}<br />
          Inhaberin: {c.owner}<br />
          {c.street}<br />
          {c.city}<br />
          {c.country}
        </p>

        <h2>Kontakt</h2>
        <p>
          Telefon: {c.phone}<br />
          E-Mail: <a href={`mailto:${c.email}`}>{c.email}</a>
        </p>

        <h2>Umsatzsteuerliche Angaben</h2>
        <p>
          Wirtschafts-Identifikationsnummer (BZSt): {c.ustId}<br />
          Eine Umsatzsteuer-Identifikationsnummer (USt-IdNr. gemäß § 27 a UStG) wird,
          soweit erforderlich, nachgereicht.
        </p>

        <h2>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
          <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
            https://ec.europa.eu/consumers/odr/
          </a>. Unsere E-Mail-Adresse findest du oben.
        </p>
        <p>
          Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>

        <h2>Haftung für Inhalte</h2>
        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach
          den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter
          jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen
          oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
        </p>

        <h2>Haftung für Links</h2>
        <p>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
          Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
          Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
          Seiten verantwortlich.
        </p>

        <h2>Urheberrecht</h2>
        <p>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem
          deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
          Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des
          jeweiligen Autors bzw. Erstellers.
        </p>

        <h2>Bildnachweise</h2>
        <p>
          Zutaten-Fotos über Wikimedia Commons: Datteln © J.P.Lon (CC BY-SA 4.0);
          Haselnüsse © Fir0002 (CC BY-SA 3.0); Kakao © Pkraemer (CC BY-SA 4.0);
          Kokosnuss © Ivar Leidus (CC BY-SA 4.0); Mandeln & Kaffee (gemeinfrei);
          Pistazien (CC0). Übrige Bilder © Esmee Mocca.
        </p>

        <p className="legal-stand">{STAND}</p>
      </>
    ),
  },

  versand: {
    title: "Versand & Zahlung",
    render: (c) => (
      <>
        <h2>Liefergebiete</h2>
        <p>Wir liefern innerhalb der Europäischen Union sowie in das Vereinigte Königreich.</p>

        <h2>Versandkosten</h2>
        <p>
          Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer, zuzüglich
          Versandkosten. Die genauen Versandkosten werden dir im Bestellprozess vor Abschluss der
          Bestellung deutlich angezeigt. Tipp: Wer mehrere Artikel in einer Bestellung zusammenfasst,
          spart Versandkosten.
        </p>

        <h2>Lieferzeit</h2>
        <p>
          Sofern nicht anders angegeben, sind alle Artikel sofort versandfertig. Die Lieferung erfolgt
          in der Regel innerhalb von 3–4 Werktagen, spätestens innerhalb von 4 Werktagen nach
          Vertragsschluss bzw. Zahlungseingang. An Feiertagen kann es zu Abweichungen kommen. Fällt das
          Fristende auf einen Samstag, Sonntag oder Feiertag, endet die Frist am nächsten Werktag.
        </p>

        <h2>Zahlungsarten</h2>
        <p>Folgende Zahlungsarten stehen zur Verfügung:</p>
        <ul>
          <li>Kredit- und Debitkarte (Visa, Mastercard, American Express)</li>
          <li>Apple Pay &amp; Google Pay</li>
          <li>Klarna</li>
          <li>SEPA-Lastschrift</li>
        </ul>
        <p>
          Die Zahlungsabwicklung erfolgt über unseren Zahlungsdienstleister. Bei Fragen zu deiner
          Bestellung erreichst du uns unter{" "}
          <a href={`mailto:${c.email}`}>{c.email}</a> oder telefonisch unter {c.phone}.
        </p>

        <p className="legal-stand">{STAND}</p>
      </>
    ),
  },

  widerruf: {
    title: "Widerrufsbelehrung",
    render: (c) => (
      <>
        <h2>Widerrufsrecht</h2>
        <p>
          Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu
          widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem du oder ein von dir
          benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen hast bzw. hat.
        </p>
        <p>
          Um dein Widerrufsrecht auszuüben, musst du uns ({c.name}, {c.street}, {c.city}, Telefon{" "}
          {c.phone}, E-Mail <a href={`mailto:${c.email}`}>{c.email}</a>) mittels einer eindeutigen
          Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über deinen Entschluss,
          diesen Vertrag zu widerrufen, informieren. Du kannst dafür das beigefügte
          Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
        </p>
        <p>
          Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung des
          Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.
        </p>

        <h2>Folgen des Widerrufs</h2>
        <p>
          Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten
          haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus
          ergeben, dass du eine andere Art der Lieferung als die von uns angebotene, günstigste
          Standardlieferung gewählt hast), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag
          zurückzuzahlen, an dem die Mitteilung über deinen Widerruf dieses Vertrags bei uns eingegangen
          ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der ursprünglichen
          Transaktion eingesetzt hast, es sei denn, mit dir wurde ausdrücklich etwas anderes vereinbart;
          in keinem Fall werden dir wegen dieser Rückzahlung Entgelte berechnet.
        </p>
        <p>
          Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis
          du den Nachweis erbracht hast, dass du die Waren zurückgesandt hast, je nachdem, welches der
          frühere Zeitpunkt ist.
        </p>
        <p>
          Du hast die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag,
          an dem du uns über den Widerruf dieses Vertrags unterrichtest, an uns zurückzusenden oder zu
          übergeben. Die Frist ist gewahrt, wenn du die Waren vor Ablauf der Frist von vierzehn Tagen
          absendest. Du trägst die unmittelbaren Kosten der Rücksendung der Waren.
        </p>
        <p>
          Du musst für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust auf
          einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise der Waren nicht
          notwendigen Umgang mit ihnen zurückzuführen ist.
        </p>

        <h2>Ausschluss bzw. vorzeitiges Erlöschen des Widerrufsrechts</h2>
        <p>
          Das Widerrufsrecht besteht nicht bzw. erlischt vorzeitig bei Verträgen zur Lieferung
          versiegelter Waren, die aus Gründen des Gesundheitsschutzes oder der Hygiene nicht zur
          Rückgabe geeignet sind, wenn ihre Versiegelung nach der Lieferung entfernt wurde, sowie bei
          Verträgen zur Lieferung von Waren, die schnell verderben können oder deren Verfallsdatum
          schnell überschritten würde.
        </p>

        <h2>Muster-Widerrufsformular</h2>
        <p>
          (Wenn du den Vertrag widerrufen möchtest, dann fülle bitte dieses Formular aus und sende es
          zurück.)
        </p>
        <div className="legal-box">
          <p>An {c.name}, {c.street}, {c.city}, E-Mail: {c.email}:</p>
          <p>
            Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf
            der folgenden Waren (*):
          </p>
          <p>
            — Bestellt am (*) / erhalten am (*): __________<br />
            — Name des/der Verbraucher(s): __________<br />
            — Anschrift des/der Verbraucher(s): __________<br />
            — Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier): __________<br />
            — Datum: __________
          </p>
          <p>(*) Unzutreffendes streichen.</p>
        </div>

        <p className="legal-stand">{STAND}</p>
      </>
    ),
  },

  agb: {
    title: "Allgemeine Geschäftsbedingungen",
    render: (c) => (
      <>
        <h2>§ 1 Geltungsbereich, Anbieter</h2>
        <p>
          Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Bestellungen, die Verbraucher
          und Unternehmer über unseren Online-Shop bei der {c.name}, {c.street}, {c.city} (nachfolgend
          „wir“) abschließen. Verbraucher ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken
          abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbständigen beruflichen
          Tätigkeit zugerechnet werden können.
        </p>

        <h2>§ 2 Vertragsschluss</h2>
        <p>
          Die Darstellung der Produkte im Online-Shop stellt kein rechtlich bindendes Angebot, sondern
          eine unverbindliche Aufforderung zur Bestellung dar. Durch Anklicken des Bestell-Buttons gibst
          du eine verbindliche Bestellung der im Warenkorb enthaltenen Waren ab. Den Eingang deiner
          Bestellung bestätigen wir per E-Mail unmittelbar nach dem Absenden. Ein verbindlicher Vertrag
          kommt mit unserer Auftragsbestätigung bzw. mit Versand der Ware zustande.
        </p>

        <h2>§ 3 Preise und Versandkosten</h2>
        <p>
          Alle Preise sind Endpreise und enthalten die gesetzliche Mehrwertsteuer. Zuzüglich zu den
          angegebenen Preisen können Versandkosten anfallen. Die Versandkosten werden im Bestellprozess
          deutlich mitgeteilt. Einzelheiten findest du unter <a href="/versand">Versand &amp; Zahlung</a>.
        </p>

        <h2>§ 4 Zahlung</h2>
        <p>
          Die Zahlung erfolgt über die im Bestellprozess angebotenen Zahlungsarten. Bei Auswahl der
          Zahlung per SEPA-Lastschrift, Kreditkarte oder Drittanbieter-Dienst gelten ergänzend die
          Bedingungen des jeweiligen Zahlungsdienstleisters.
        </p>

        <h2>§ 5 Lieferung</h2>
        <p>
          Die Lieferung erfolgt an die von dir angegebene Lieferadresse. Angaben zu Lieferzeiten und
          Liefergebieten findest du unter <a href="/versand">Versand &amp; Zahlung</a>.
        </p>

        <h2>§ 6 Eigentumsvorbehalt</h2>
        <p>Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.</p>

        <h2>§ 7 Widerrufsrecht</h2>
        <p>
          Verbrauchern steht ein gesetzliches Widerrufsrecht zu. Die Einzelheiten ergeben sich aus
          unserer <a href="/widerruf">Widerrufsbelehrung</a>.
        </p>

        <h2>§ 8 Gewährleistung</h2>
        <p>
          Es gilt das gesetzliche Mängelhaftungsrecht. Bei Mängeln der gelieferten Ware kannst du dich
          jederzeit unter <a href={`mailto:${c.email}`}>{c.email}</a> an uns wenden.
        </p>

        <h2>§ 9 Streitbeilegung</h2>
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit:{" "}
          <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
            https://ec.europa.eu/consumers/odr/
          </a>. Zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
          sind wir nicht verpflichtet und grundsätzlich nicht bereit.
        </p>

        <h2>§ 10 Schlussbestimmungen</h2>
        <p>
          Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Sollten
          einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen
          Bestimmungen unberührt.
        </p>

        <p className="legal-stand">{STAND}</p>
      </>
    ),
  },

  datenschutz: {
    title: "Datenschutzerklärung",
    render: (c) => (
      <>
        <h2>1. Verantwortlicher</h2>
        <p>
          Verantwortlich für die Datenverarbeitung auf dieser Website ist:<br />
          {c.name} – {c.form}, Inhaberin: {c.owner}<br />
          {c.street}, {c.city}<br />
          Telefon: {c.phone} · E-Mail: <a href={`mailto:${c.email}`}>{c.email}</a>
        </p>

        <h2>2. Allgemeines zur Datenverarbeitung</h2>
        <p>
          Wir verarbeiten personenbezogene Daten unserer Nutzer grundsätzlich nur, soweit dies zur
          Bereitstellung einer funktionsfähigen Website sowie unserer Inhalte und Leistungen
          erforderlich ist. Rechtsgrundlagen sind insbesondere Art. 6 Abs. 1 DSGVO (Einwilligung,
          Vertragserfüllung, rechtliche Verpflichtung sowie berechtigtes Interesse).
        </p>

        <h2>3. Hosting</h2>
        <p>
          Diese Website wird bei der Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA,
          gehostet. Beim Aufruf der Website werden technische Daten (z. B. IP-Adresse, Datum und
          Uhrzeit) verarbeitet, um die Auslieferung der Seite zu ermöglichen. Rechtsgrundlage ist unser
          berechtigtes Interesse an einem sicheren und effizienten Betrieb (Art. 6 Abs. 1 lit. f DSGVO).
          Mit dem Anbieter besteht ein Auftragsverarbeitungsvertrag; eine Übermittlung in die USA wird
          auf Grundlage geeigneter Garantien (EU-Standardvertragsklauseln) abgesichert.
        </p>

        <h2>4. Shop- und Bestellabwicklung</h2>
        <p>
          Für den Betrieb des Shops und die Abwicklung von Bestellungen nutzen wir die Plattform
          Shopify (Shopify International Ltd., Irland). Im Rahmen einer Bestellung verarbeiten wir die
          von dir angegebenen Daten (z. B. Name, Anschrift, E-Mail-Adresse, Zahlungs- und
          Bestelldaten), um den Kaufvertrag zu erfüllen (Art. 6 Abs. 1 lit. b DSGVO). Diese Daten geben
          wir nur an beauftragte Dienstleister (z. B. Zahlungs- und Versanddienstleister) weiter, soweit
          dies zur Vertragsabwicklung erforderlich ist.
        </p>

        <h2>5. Server-Logfiles</h2>
        <p>
          Beim Besuch der Website werden automatisch Informationen in Server-Logfiles erfasst, die dein
          Browser übermittelt (Browsertyp/-version, Betriebssystem, Referrer-URL, Uhrzeit,
          IP-Adresse). Diese Daten werden nicht mit anderen Datenquellen zusammengeführt und dienen der
          technischen Bereitstellung und Sicherheit (Art. 6 Abs. 1 lit. f DSGVO).
        </p>

        <h2>6. Cookies und lokale Speicherung</h2>
        <p>
          Wir setzen technisch notwendige Cookies bzw. den lokalen Speicher des Browsers ein, etwa um
          deine gewählte Sprache und deinen Warenkorb zu speichern. Diese sind für den Betrieb der
          Website erforderlich (Art. 6 Abs. 1 lit. f DSGVO). Soweit weitere, nicht notwendige Dienste
          eingesetzt werden, erfolgt dies nur mit deiner Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).
        </p>

        <h2>7. Kontaktaufnahme</h2>
        <p>
          Wenn du uns per E-Mail, Telefon oder WhatsApp kontaktierst, verarbeiten wir die von dir
          mitgeteilten Daten zur Bearbeitung deiner Anfrage. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
          bzw. lit. f DSGVO. Die Daten werden gelöscht, sobald sie für die Erreichung des Zwecks nicht
          mehr erforderlich sind und keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
        </p>

        <h2>8. Newsletter</h2>
        <p>
          Für den Versand unseres Newsletters nutzen wir das Double-Opt-in-Verfahren: Nach der Anmeldung
          erhältst du eine Bestätigungs-E-Mail. Die Verarbeitung erfolgt auf Grundlage deiner
          Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Du kannst den Newsletter jederzeit über den Link
          in jeder E-Mail oder per Nachricht an uns abbestellen.
        </p>

        <h2>9. Zahlungs- und Versanddienstleister</h2>
        <p>
          Zur Zahlungsabwicklung geben wir die erforderlichen Daten an den jeweils gewählten
          Zahlungsdienstleister weiter. Zur Lieferung übermitteln wir die Versanddaten an das
          beauftragte Versandunternehmen (z. B. DHL). Rechtsgrundlage ist jeweils die
          Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).
        </p>

        <h2>10. Schriftarten (Google Fonts)</h2>
        <p>
          Zur einheitlichen Darstellung binden wir Schriftarten ein, die von Google geladen werden
          können. Dabei kann deine IP-Adresse an Google übertragen werden. Rechtsgrundlage ist unser
          berechtigtes Interesse an einer ansprechenden Darstellung (Art. 6 Abs. 1 lit. f DSGVO).
        </p>

        <h2>11. Deine Rechte</h2>
        <p>
          Dir stehen die folgenden Rechte zu: Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16),
          Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20)
          sowie Widerspruch gegen die Verarbeitung (Art. 21). Eine erteilte Einwilligung kannst du
          jederzeit mit Wirkung für die Zukunft widerrufen. Zur Ausübung genügt eine Nachricht an{" "}
          <a href={`mailto:${c.email}`}>{c.email}</a>.
        </p>
        <p>
          Zudem hast du das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, z. B. bei
          der Landesbeauftragten für Datenschutz und Informationsfreiheit Nordrhein-Westfalen.
        </p>

        <h2>12. Datensicherheit</h2>
        <p>
          Diese Website nutzt aus Sicherheitsgründen eine SSL- bzw. TLS-Verschlüsselung. Eine
          verschlüsselte Verbindung erkennst du an „https://“ in der Adresszeile deines Browsers.
        </p>

        <p className="legal-stand">{STAND}</p>
      </>
    ),
  },
};
