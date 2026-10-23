<script setup lang="ts">
const title = 'Impressum & Rechtliches - Fungio'
const description = 'Anbieterkennzeichnung und rechtliche Hinweise von Fungio.'
const image = 'https://fungio.de/mushroom.png'
const url = 'https://fungio.de/imprint'

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description,
  ogUrl: url,
  ogImage: image,
  ogType: 'article'
})
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-12 text-tan-800 leading-relaxed">
    <h1 class="text-3xl font-bold text-tan-900 mb-6">Impressum</h1>

    <section class="mb-8 space-y-4">
      <p class="font-semibold text-tan-600">Angaben gemäß § 5 DDG</p>

      <p>
        Johannes Schweig<br>
        Flemingstr. 6<br>
        10557 Berlin
      </p>

      <p>
        <strong>Vertreten durch:</strong><br>
        Johannes Schweig
      </p>

      <p>
        <strong>Kontakt:</strong><br>
        Telefon: 030/60269851<br>
        E-Mail: <a href="mailto:info@fungio.de" class="link">info@fungio.de</a>
      </p>

      <p>
        <strong>Umsatzsteuer-ID:</strong><br>
        Umsatzsteuer-Identifikationsnummer gemäß §27a Umsatzsteuergesetz
        DE363289149
      </p>
    </section>

    <section class="mb-8">
      <h2 class="text-xl font-bold text-tan-900 mb-2">Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
      <p>
        Wir nehmen nicht an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teil und sind dazu auch
        nicht verpflichtet.
      </p>
    </section>

    <section class="mb-8">
      <p>
        <strong>Datenschutzerklärung</strong><br>
        Unter dem folgenden Link finden Sie unsere <a href="/privacy" class="link">Datenschutzerklärung</a>.
      </p>
    </section>

    <section id="quellen-lizenzen" class="mb-8 scroll-mt-20">
      <h2 class="text-xl font-bold text-tan-900 mb-2">Quellen &amp; Lizenzen</h2>
      <p class="mb-3">
        <strong>Deutsche Pilznamen:</strong> Wo iNaturalist keinen deutschen Namen hat, verwenden wir den Namen aus der
        Taxonliste der Pilze Deutschlands der DGfM.
      </p>
      <p class="mb-3">
        Quelle: Dämmrich F., <em>Taxon list of fungi and fungal-like organisms from Germany compiled by the DGfM</em>,
        SNSB IT Center, München,
        <a href="https://doi.org/10.15468/gtvmjw" target="_blank" rel="noopener" class="link">doi:10.15468/gtvmjw</a>,
        Lizenz <a href="https://creativecommons.org/licenses/by/4.0/deed.de" target="_blank" rel="noopener"
          class="link">CC BY 4.0</a>.
      </p>
      <p>
        Wir haben Schreibweisen vereinheitlicht und je Art den Hauptnamen übernommen. Die DGfM und der Autor
        unterstützen Fungio nicht.
      </p>
    </section>

    <section class="space-y-6">
      <h2 class="text-2xl font-bold text-tan-900">Haftungsausschluss</h2>

      <div>
        <h3 class="font-bold text-tan-900 mb-2">Wichtiger Hinweis zur Pilzbestimmung</h3>
        <p class="mb-3">
          Die auf dieser Website zur Verfügung gestellten Informationen zur Pilzbestimmung dienen ausschließlich
          allgemeinen Informationszwecken.
          Die Nutzung der Informationen erfolgt ausdrücklich auf <strong>eigene Gefahr</strong>.
        </p>
        <p class="mb-3">
          <strong>Vor dem Verzehr eines Pilzes ist immer eine fachkundige Kontrolle durch einen geprüften
            Pilzsachverständigen zwingend erforderlich.</strong>
          Pilzmerkmale können sich örtlich und zeitlich stark unterscheiden; Fehldiagnosen können lebensgefährliche
          Folgen
          haben.
        </p>
        <p class="text-sm">
          Eine Haftung für materielle oder gesundheitliche Schäden ist ausgeschlossen, es sei denn, es liegt ein
          nachweislich vorsätzliches oder grob fahrlässiges Verschulden vor.
        </p>
      </div>
      <div>

        <h3 class="font-bold text-tan-900 mb-1">Haftung für Inhalte</h3>
        <p>
          Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und
          Aktualität
          der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs.1 DDG für
          eigene
          Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als
          Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen
          oder
          nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung
          oder
          Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine
          diesbezügliche
          Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei
          Bekanntwerden
          von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
        </p>
      </div>

      <div>
        <h3 class="font-bold text-tan-900 mb-1">Haftung für Links</h3>
        <p>
          Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben.
          Deshalb
          können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist
          stets
          der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt
          der
          Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung
          nicht
          erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte
          einer
          Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend
          entfernen.
        </p>
      </div>

      <div>
        <h3 class="font-bold text-tan-900 mb-1">Urheberrecht</h3>
        <p>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen
          Urheberrecht.
          Die Vervielfältigung, Bearbeitung, Verbreitung und jede Arbeit der Verwertung außerhalb der Grenzen des
          Urheberrechtes
          bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite
          sind
          nur für den privaten, nicht kommerziellen Gebrauch gestattet. Soweit die Inhalte auf dieser Seite nicht vom
          Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als
          solche
          gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen
          entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend
          entfernen.
        </p>
      </div>
    </section>

    <footer class="mt-12 pt-6 text-xs text-tan-500 space-y-2">
      <p>
        Erstellt mit dem <a href="https://impressum-generator.de" rel="dofollow" class="link">Impressum-Generator</a>
        von
        WebsiteWissen.com, dem Ratgeber für <a href="https://websitewissen.com/website-erstellen" rel="dofollow"
          class="link">Website-Erstellung</a>.
      </p>
      <p>
        Rechtstext von der <a href="https://www.kanzlei-hasselbach.de/" rel="dofollow" class="link">Kanzlei
          Hasselbach</a>.
      </p>
    </footer>
  </div>
</template>