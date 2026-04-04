# Lentopallo-rotaatiosovellus — Seuratason PRD

## Context

Nykyinen sovellus on yksisivuinen HTML/JS-tiedosto (810 riviä), joka toimii paikallisesti selaimessa ilman backendiä. Data tallennetaan localStorageen. Sovellusta halutaan laajentaa koko seuran käyttöön, mikä vaatii käyttäjähallintaa, tietokantaa, tilastojen hakua ja tietoturvaa.

**Nykytila:** `standalone/Lentopallo.html` — puhdas HTML/CSS/JS, ei frameworkeja.

---

## 1. Käyttäjähallinta

### 1.1 Roolit
- **Seuran admin** — hallitsee joukkueita, pelaajia, käyttäjiä. Näkee kaiken.
- **Valmentaja** — hallitsee oman joukkueensa pelaajia, rotaatioita, pisteitä. Voi luoda otteluita.
- **Pelaaja/katsoja** (valinnainen, myöhemmin) — voi katsella omia tilastoja, ei muokkausoikeuksia.

### 1.2 Autentikointi
- Supabase Auth: sähköposti + salasana (perus)
- Magic link (salasanaton kirjautuminen sähköpostilla) — helpompi käyttöönotto
- Ei sosiaalista kirjautumista alkuun (yksinkertaistetaan)

### 1.3 Ilkivallan esto
- Row Level Security (RLS) Supabasessa — käyttäjä näkee/muokkaa vain oman seuransa/joukkueensa dataa
- Rate limiting Supabase Edge Functionsilla (esim. max 100 pistettä/min)
- Input-validointi: pelinumero 1–99, nimi max 30 merkkiä, erä 1–5
- CSRF/XSS-suojaus: nykyinen `esc()`-funktio säilyy, Supabase hoitaa API-puolen
- Audit log: kuka muutti mitä, milloin (events-taulussa jo `ts`-kenttä)

---

## 2. Tietokanta (Supabase/PostgreSQL)

### 2.1 Taulurakenne

```sql
-- Seurat
clubs (
  id uuid PK DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
)

-- Joukkueet
teams (
  id uuid PK DEFAULT gen_random_uuid(),
  club_id uuid FK → clubs.id,
  name text NOT NULL,          -- esim. "Tytöt 2014"
  season text,                 -- esim. "2025-2026"
  created_at timestamptz DEFAULT now()
)

-- Pelaajat
players (
  id uuid PK DEFAULT gen_random_uuid(),
  team_id uuid FK → teams.id,
  nr int NOT NULL CHECK (nr BETWEEN 1 AND 99),
  name text NOT NULL,
  role text CHECK (role IN ('normaali','passari','libero')) DEFAULT 'normaali',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, nr)
)

-- Ottelut
matches (
  id uuid PK DEFAULT gen_random_uuid(),
  team_id uuid FK → teams.id,
  opponent text,
  date date,
  notes text,
  created_at timestamptz DEFAULT now()
)

-- Tapahtumat (= nykyinen eventLog)
events (
  id bigint PK GENERATED ALWAYS AS IDENTITY,
  match_id uuid FK → matches.id,
  set_nr int NOT NULL CHECK (set_nr BETWEEN 1 AND 5),
  player_id uuid FK → players.id,
  delta int NOT NULL CHECK (delta IN (-1, +1)),
  court_json jsonb,            -- kenttätilanne tapahtuma-hetkellä
  position int,                -- pelipaikka (1-6) tapahtuma-hetkellä
  ts timestamptz DEFAULT now()
)

-- Käyttäjäprofiilit
profiles (
  id uuid PK FK → auth.users.id,
  club_id uuid FK → clubs.id,
  role text CHECK (role IN ('admin','coach','viewer')) DEFAULT 'viewer',
  display_name text,
  created_at timestamptz DEFAULT now()
)
```

### 2.2 Row Level Security (RLS)

```
- profiles: käyttäjä näkee vain oman profiilinsa
- clubs: käyttäjä näkee vain oman seuransa
- teams: käyttäjä näkee vain oman seuransa joukkueet
- players: käyttäjä näkee vain oman seuransa pelaajat
- matches: valmentaja/admin voi luoda, kaikki seuran jäsenet näkevät
- events: valmentaja/admin voi luoda, kaikki seuran jäsenet näkevät
- INSERT/UPDATE/DELETE: vain admin + coach (paitsi profiles: vain oma)
```

### 2.3 Indeksit

```sql
CREATE INDEX idx_events_match ON events(match_id);
CREATE INDEX idx_events_player ON events(player_id);
CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_matches_team ON matches(team_id, date);
```

---

## 3. Tilastot

### 3.1 Per pelaaja
- Syöttöpisteet per erä, per ottelu, per kausi
- Syöttöputket (pisin, keskiarvo, lista)
- Syöttötehokkuus: pisteet / (pisteet + menetetyt)
- Trendikaavio: pisteet per ottelu aikajärjestyksessä

### 3.2 Per joukkue
- Joukkueen kokonaissyöttöpisteet
- Paras syöttäjä per ottelu / per kausi
- Eräkohtaiset tilastot

### 3.3 Toteutus
- SQL-kyselyt Supabasesta (aggregaatiot: SUM, COUNT, GROUP BY)
- Frontend laskee putket eventLogista (nykyinen `calcStreaks()` siirtyy)
- Myöhemmin: Supabase Views tai Edge Functions raskaille raporteille

---

## 4. Lentopalloliiton data

### 4.1 Tutkittavaa
- Onko Suomen Lentopalloliiton (lentopalloliitto.fi) API olemassa?
- Joukkueiden ja pelaajien tiedot: tulospalvelu.fi / torneopal.fi?
- Vaihtoehto: CSV-importti jos API:a ei ole
- Vaihtoehto: manuaalinen syöttö (nykyinen tapa, toimii aina)

### 4.2 Jos API löytyy
- Hae joukkueen pelaajat liiton rekisteristä seuran nimellä
- Synkronoi pelinumerot ja nimet
- Päivitä kauden alussa

### 4.3 Jos API:a ei ole
- CSV/Excel-importti: valmentaja lataa joukkueen pelaajat tiedostosta
- Manuaalinen syöttö rosteriin (nykyinen toiminnallisuus)

---

## 5. Varmuuskopiointi

### 5.1 Automaattinen päivittäinen backup
- Supabase pg_dump cron-jobilla (Supabase Dashboard → Backups, sisältyy Pro-tilaukseen)
- TAI: Edge Function joka ajaa `pg_dump` ja tallentaa Supabase Storageen
- TAI: GitHub Actions workflow joka ajaa pg_dump ja commitoi SQL-dumpin repoon

### 5.2 Suositus: Supabase Pro
- Automaattiset päivittäiset backupit sisältyvät (7 päivän retentio)
- Point-in-time recovery (PITR) lisämaksusta
- Hinta: $25/kk

### 5.3 Ilmainen vaihtoehto
- GitHub Actions + `pg_dump` kerran päivässä
- Tallennus: private GitHub repoon tai S3-ämpäriin
- Retentio: 30 päivää (vanhemmat poistetaan automaattisesti)

### 5.4 Korruptiosuojaus
- PostgreSQL on ACID-yhteensopiva → korruptio erittäin harvinaista
- Suurin riski: väärä RLS-sääntö tai bugi joka kirjoittaa väärää dataa
- Audit log (events-taulun ts + court_json) mahdollistaa tilan palauttamisen

---

## 6. Arkkitehtuuri ja migraatio

### 6.1 Vaihe 1: Supabase + Auth (MVP)
- Supabase-projekti pystyyn
- Taulut + RLS
- Auth: magic link
- Nykyinen HTML/JS refaktoroidaan: localStorage → Supabase JS client
- Offline-tuki: localStorage fallback, synkronoi kun netti palaa

### 6.2 Vaihe 2: Tilastot + monikäyttäjä
- Tilastonäkymä (per pelaaja, per joukkue)
- Admin-paneeli (käyttäjien hallinta)
- Joukkueen valinta kirjautumisen jälkeen

### 6.3 Vaihe 3: Integraatiot
- Lentopalloliiton data (jos API löytyy)
- PWA (offline, kotinäytölle asennus)
- Push-notifikaatiot (valinnainen)

### 6.4 Tech stack — PÄÄTETTY
- **Vite + vanilla TypeScript + Supabase JS client**
- Offline-tuki heti (localStorage-fallback + sync)
- Hosting: GitHub Pages (Vite build → docs/ tai gh-pages branch)
- PWA: Service Worker + manifest.json heti mukaan

---

## 7. Turvallisuus yhteenveto

| Uhka | Suojaus |
|------|---------|
| Luvaton pääsy | Supabase Auth + RLS |
| Toisen seuran data | RLS: club_id-suodatus |
| XSS | esc()-funktio + CSP-headerit |
| Massamuokkaus | Rate limiting Edge Functionsilla |
| Data loss | Päivittäinen backup |
| Väärä data | Audit log + CHECK-rajoitteet |

---

## 8. Avoimet kysymykset

1. Montako joukkuetta seurassa tyypillisesti? (vaikuttaa UI-suunnitteluun)
2. ~~Tarvitaanko offline-tuki heti vai myöhemmin?~~ → HETI
3. Supabase Free vai Pro? (backup-strategia riippuu tästä)
4. ~~Halutaanko pysyä yhdessä HTML-tiedostossa vai siirtyä frameworkiin?~~ → Vite + vanilla TS
5. Onko tarvetta monikielisyydelle (suomi/ruotsi/englanti)?
