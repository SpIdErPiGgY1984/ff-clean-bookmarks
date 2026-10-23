# 🦊 Spiderpiggy Clean Bookmarks

[**Nederlands**](#nederlands) | [**English**](#english)

Een moderne, compacte Firefox-bladwijzerextensie, ontwikkeld als aangepaste versie van **My Clean Bookmarks** door Virtuos86.  
A compact, modern Firefox bookmark extension, based on **My Clean Bookmarks** by Virtuos86.

**Versie / Version:** 1.0.0  
**Firefox:** Desktop 140+  
**Repository:** https://github.com/SpIdErPiGgY1984/ff-clean-bookmarks

---

## Nederlands

### Functies

- Snelle, compacte bladwijzerlijst met mappen, submappen en een handige terugnavigatie.
- **Automatisch licht/donker** volgens de Firefox/systeemvoorkeur, plus vaste **Light** en **Spiderpiggy Dark** thema's.
- Drie feestthema's: **Halloween**, **Kerstmis** en **Nieuwjaar**.
- Automatische feestdagen (uitschakelbaar): Halloween **25 oktober t/m 1 november**, Kerstmis **20 t/m 26 december**, Nieuwjaar **27 december t/m 3 januari**. De kalender gebruikt je lokale tijdzone.
- Zelfgemaakte CSS blijft beschikbaar en opgeslagen voorkeuren worden behouden.
- Mappen openen bij aanwijzen, met standaardvertraging van **850 ms** (aanpasbaar).
- Bladwijzers in nieuwe tabbladen openen; middelste muisknop wordt ondersteund.
- Optionele favicons: standaard uit, met een lokale letter als reserve-icoon. Uitgebreide herkenning kan na extra Firefox-toestemming faviconlinks uit HTTPS-pagina's vinden.
- Nederlandse, Engelse en Russische interfacevertalingen.

### Installeren

1. Een permanente installatie vereist een **door Mozilla ondertekende** `.xpi` of publicatie op [Firefox Add-ons](https://addons.mozilla.org/).
2. Om de broncode **tijdelijk** te testen: open Firefox `about:debugging#/runtime/this-firefox`.
3. Kies **Tijdelijke add-on laden** en selecteer `manifest.json` in de uitgepakte bronmap.
4. Open de extensie-instellingen om thema, map, vertraging en favicons in te stellen.
5. Vastmaken aan de werkbalk doe je zelf via het Firefox-extensiemenu; een add-on kan dit niet automatisch doen.

### Privacy en toestemmingen

De bladwijzers en voorkeuren blijven lokaal opgeslagen in Firefox. De extensie gebruikt geen analytics, accounts, eigen verzamelserver, synchronisatie of externe JavaScript-code.

Het laden van echte favicons is **vrijwillig** en staat standaard uit. Zodra je dit inschakelt, kan een verzoek naar de betreffende HTTPS-website of faviconserver zichtbaar zijn voor die partij. Firefox vraagt daarvoor afzonderlijk toestemming voor het delen van bladwijzerinformatie.

Voor **uitgebreide faviconherkenning** vraagt Firefox bovendien optioneel toegang tot `https://*/*` en `tabs`. Daarmee kan de extensie openbare HTML en reeds bekende tabbladiconen raadplegen. Deze rechten bieden technisch ruimere toegang dan uitsluitend favicons; geef ze alleen als je dat wilt. Verzoeken voor HTML worden zonder cookies of verwijzende URL uitgevoerd. De optionele rechten kunnen weer worden ingetrokken door favicons uit te schakelen of via Firefox.

**Beperking:** websites kunnen een favicon blokkeren, omleiden of verplaatsen. Sommige sites, bijvoorbeeld Telenet TV, tonen daarom mogelijk nog het lettericoontje.

### Ontwikkelen en verpakken

De extensie bestaat uit HTML, CSS en JavaScript en heeft geen compileerstap nodig.

```bash
npm install --global web-ext
web-ext lint
web-ext build --overwrite-dest
```

Voer de laatste twee opdrachten uit **in de map waar `manifest.json` staat**. Het bronarchief bevat alle bestanden; de Mozilla-upload ZIP moet `manifest.json` direct in de hoofdmap hebben. Tests in `about:debugging` zijn tijdelijk; publicatie vereist goedkeuring en ondertekening door Mozilla.

---

## English

### Features

- Compact, fast bookmark popup with folders, nested folders and convenient back navigation.
- **Automatic light/dark** based on the Firefox/system preference, plus dedicated **Light** and **Spiderpiggy Dark** themes.
- Seasonal themes: **Halloween**, **Christmas** and **New Year**.
- Optional automatic dates: Halloween **October 25–November 1**, Christmas **December 20–26**, New Year **December 27–January 3**, using the browser's local date.
- Custom CSS and existing saved preferences are preserved.
- Hover-to-open folders with an adjustable **850 ms** default delay.
- Open bookmarks in new tabs and use middle-click.
- Optional favicons, disabled by default. A local letter icon appears when no real favicon is available. Enhanced discovery can read favicon links from HTTPS pages after extra Firefox consent.
- Dutch, English and Russian interface translations.

### Installation

1. Permanent installation requires a Mozilla-**signed** `.xpi` or publication on [Firefox Add-ons](https://addons.mozilla.org/).
2. To test the unpacked source **temporarily**, open Firefox `about:debugging#/runtime/this-firefox`.
3. Select **Load Temporary Add-on** and choose `manifest.json` from the source directory.
4. Use the extension options to select a theme, root folder, delay and favicon behaviour.
5. Pin the icon manually using Firefox's Extensions menu; extensions cannot pin themselves automatically.

### Privacy and permissions

Bookmarks and settings stay in Firefox local storage. There is no analytics, account, central collection server, external JavaScript or custom cloud synchronisation.

Real favicon loading is **opt-in** and off by default. Enabling it may send HTTPS image requests to the bookmarked websites and their favicon/CDN hosts, which may observe the request. Firefox asks separately for consent to transmit bookmark-related information.

**Enhanced favicon detection** requests optional `https://*/*` host access and `tabs` permission. The feature uses these to inspect public page HTML for icon links and reuse favicon URLs from open browser tabs. These permissions technically allow broader access than icon retrieval alone; grant them only if you are comfortable. HTML requests are made without credentials or referrer. Optional permissions can be revoked by disabling favicons or in Firefox.

**Known limitation:** some sites redirect, block or relocate their favicons. For example, Telenet TV may still show the letter fallback.

### Development and packaging

This add-on uses plain HTML, CSS and JavaScript. No compilation is required.

```bash
npm install --global web-ext
web-ext lint
web-ext build --overwrite-dest
```

Run the last two commands **from the folder containing `manifest.json`**. The source ZIP contains the full project. A ZIP submitted to AMO must put `manifest.json` at its root. Temporary development installations are removed after restarting Firefox. Mozilla signing is required for general distribution.

---

## Credits / Auteurs

- **Original author / oorspronkelijke auteur:** Vitaly / [Virtuos86](https://github.com/Virtuos86/ff-clean-bookmarks), creator of **My Clean Bookmarks**.
- **Spiderpiggy fork and improvements:** [SpIdErPiGgY1984](https://github.com/SpIdErPiGgY1984).
- **Original Firefox listing:** https://addons.mozilla.org/en-US/firefox/addon/my-clean-bookmarks/
- **License:** [Mozilla Public License 2.0](LICENSE) as indicated on the original AMO listing. See [third-party notices](THIRD_PARTY_NOTICES.md) for source-provenance and jQuery attribution. The original GitHub snapshot contains no explicit license file; please verify that the AMO license covers the upstream revision before public distribution.

**Spiderpiggy Clean Bookmarks is an independent fork, not an official update or transfer of ownership of the original Mozilla Add-ons listing.**
