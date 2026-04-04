# Lentopallo-rotaatiosovellus — UI-suunnitteluperiaatteet

## 1. Pelikentän reunalla -käyttö
- Käytetään pelin aikana, yhdellä kädellä, nopeasti
- Kaikki napit min 48x48px (mieluiten 56px+)
- Kriittiset napit (+1, -1, rotaatio) isompia kuin muut
- Ei tarkkuutta vaativia elementtejä

## 2. Hierarkia: kenttä ensin
- Kenttä aina näkyvissä ilman scrollausta
- Rosteri ja tilastot toissijaiset, piilotettavissa
- Max 1 scroll-pituus toimintoihin pelin aikana

## 3. Virheensietokyky
- Vahvistuskysely destruktiivisille toiminnoille (tyhjennä, uusi peli)
- Undo mahdollinen pisteille (eventLog-pohjainen)
- Vahingossa painaminen ei saa rikkoa mitään

## 4. Visuaalinen selkeys
- Iso kontrasti: tumma teksti, vaalea tausta
- Värikoodit: vihreä = positiivinen, punainen = negatiivinen, sininen = toiminto
- Pelaajan numero aina bold + iso, nimi tavallinen
- Pelipaikkanumero pienellä, ei kilpaile pelaajatiedon kanssa

## 5. Mobiili ensin
- Suunnittelu 375px leveydelle
- Touch-ystävälliset välit (min 8px elementtien välillä)
- Ei hover-riippuvaisia toimintoja
- Dropdown/picker koko näytön levyinen mobiilissa

## 6. Minimaalisuus
- Ei turhia koristeita tai animaatioita (paitsi pistefeedback)
- Yksi fontti (system-ui)
- Mustavalko + 3 korostusväriä (sininen, vihreä, punainen)

## 7. Vakiomitat
- Kenttäruudut aina samankokoisia (min-height kiinteä), myös tyhjänä
- Picker avautuu isona mobiilissa (min-width: 90vw tai 320px)
- Grid-elementit eivät saa hyppiä sisällön muuttuessa
