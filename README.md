# Headspace

Journal-app met agenda, flags, check-ins (mood, stress, slaap), doelen en statistieken.
Je gsm en je computer blijven automatisch gelijk, en je krijgt op willekeurige momenten een van je eigen quotes als pushmelding.

## Lanceren (eenmalig, ±10 minuten)

### 1. Bewaar je data uit de vorige versie
Open de oude Headspace (de GitHub Pages-link) op elk toestel waar je iets in schreef en kies **Back-up downloaden**.
Bewaar die bestanden even, je laadt ze straks in.

### 2. Zet de bestanden op GitHub
1. Ga naar je repo **WolfDhaene/Headspace** op github.com.
2. **Add file › Upload files**.
3. Pak de zip uit en sleep **alles wat erin zit** (ook de mappen `public` en `netlify`) naar het uploadvenster.
4. Klik **Commit changes**.

De oude `index.html` in de hoofdmap mag blijven staan: je oude versie werkt dan nog tot je alles hebt overgezet.

### 3. Koppel GitHub aan Netlify
1. Op [app.netlify.com](https://app.netlify.com): **Add new project › Import an existing project › GitHub**.
2. Kies de repo **Headspace**.
3. Laat alle instellingen zoals ze zijn (die staan al in `netlify.toml`) en klik **Deploy**.
4. Optioneel: **Project configuration › Change project name**, bv. `headspace-wolf` → je app staat dan op `https://headspace-wolf.netlify.app`.

Er zijn geen sleutels of wachtwoorden in te stellen: de server maakt die zelf aan bij de eerste melding.
Vanaf nu zet Netlify elke wijziging op GitHub automatisch online.

### 4. Pc en gsm koppelen
1. Open je Netlify-link op je **computer** en kies **Dit is mijn eerste toestel**. Je ziet een QR-code.
2. Richt de **camera van je gsm** op die QR-code en tik op de link. Headspace opent en is meteen gekoppeld.
3. Op je gsm in Chrome: menu **⋮ › Installeren** (of *Toevoegen aan startscherm*). Headspace staat nu als app op je gsm.

Lukt scannen niet? Typ op je gsm de code die onder de QR-code staat (kleine letters en zonder streepjes mag ook).
De QR-code en code vind je later altijd terug via het **tandwiel** rechtsboven.

### 5. Oude data inladen
Op één toestel: **tandwiel › Laad back-up** en kies de bestanden uit stap 1. Ze komen vanzelf ook op je andere toestel.
Twee keer dezelfde back-up laden geeft geen dubbels.

### 6. Pushmeldingen aanzetten (gsm)
In de geïnstalleerde app: **tandwiel › Pushmeldingen op dit toestel** aan, toestaan, en tik op **Stuur een testmelding**.
Daar kies je ook hoeveel quotes per dag je krijgt, tussen welke uren, en of je een herinnering voor je check-in wil.

## Goed om te weten
- **Quotes** zijn gewone notities met de flag `quote` (of `les`). Selecteer een stuk tekst en tik op ❝ om enkel dat stuk als quote te gebruiken.
- **Offline** schrijven kan altijd. Het bolletje op het tandwiel kleurt oranje zolang een sync niet lukt; zodra je weer online bent, gaat alles mee.
- Alles wat je schrijft staat op je toestellen én in de opslag van je eigen Netlify-project. Wie je code kent, kan je gedachten lezen: deel hem met niemand.
- **Download af en toe een back-up** via het tandwiel. Dat is je vangnet als er ooit iets misgaat.

## Hoe het in elkaar zit
| Map / bestand | Wat |
|---|---|
| `public/index.html` | De hele app (opmaak en code in één bestand) |
| `public/sw.js` | Maakt de app installeerbaar, offline bruikbaar en toont pushmeldingen |
| `netlify/functions/sync.mjs` | Voegt de data van je toestellen samen (per item wint de laatste wijziging) |
| `netlify/functions/push.mjs` | Toestellen aan- en afmelden voor meldingen, testmelding |
| `netlify/functions/nudge.mjs` | Draait elk kwartier en verstuurt quotes en check-in-herinneringen |
| `netlify/lib/` | Gedeelde code en de planning van de meldingen |
