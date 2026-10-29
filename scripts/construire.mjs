// construit api/movies.json et api/genres.json à partir de deux sources libres d'accès :
// sample apis (titre, affiche, identifiant imdb, catégorie) et wikidata (titre français, année,
// durée, réalisateurs, acteurs, genres...)
// lancement : node scripts/construire.mjs

import { mkdir, writeFile } from "node:fs/promises";

const DOSSIER_API = new URL("../api/", import.meta.url);

// les catégories de sample apis, une adresse par catégorie
const CATEGORIES = [
  "action-adventure",
  "animation",
  "classic",
  "comedy",
  "drama",
  "family",
  "horror",
  "mystery",
  "scifi-fantasy",
  "western",
];

// les genres de l'api, du plus précis au plus large : le premier genre d'un film est le plus parlant.
// chaque genre est reconnu dans les libellés français des genres wikidata
const GENRES = [
  { id: "animation", label: "Animation", motif: /animation|dessin animé/ },
  { id: "western", label: "Western", motif: /western/ },
  { id: "horror", label: "Horreur", motif: /horreur|horrifique|slasher|gore|zombies|vampires|loup-garou|monstre/ },
  { id: "science-fiction", label: "Science-Fiction", motif: /science-fiction|dystopi|apocalyptique|cyberpunk|space opera|voyage dans le temps|extraterrestre/ },
  { id: "fantasy", label: "Fantastique", motif: /fantasy|fantastique|conte de fées|surnaturel|fantômes|wuxia/ },
  { id: "war", label: "Guerre", motif: /guerre/ },
  { id: "musical", label: "Musical", motif: /musical|comédie musicale|danse/ },
  { id: "biopic", label: "Biopic", motif: /biographi/ },
  { id: "documentary", label: "Documentaire", motif: /^film documentaire$/ },
  { id: "sport", label: "Sportif", motif: /sport|boxe|football/ },
  { id: "crime", label: "Policier", motif: /policier|policière|criminel|gangsters|noir|détective|casse|procès/ },
  { id: "thriller", label: "Thriller", motif: /thriller|suspense|énigme|espionnage/ },
  { id: "action", label: "Action", motif: /action|arts martiaux|super-héros|kung-fu|ninja/ },
  { id: "adventure", label: "Aventure", motif: /aventure|cape et d'épée|pirates|chasse au trésor/ },
  { id: "romance", label: "Romance", motif: /amour|romanti|remariage/ },
  { id: "comedy", label: "Comédie", motif: /comédie|comique|humoristique|parodi|satire|slapstick|screwball/ },
  { id: "family", label: "Familial", motif: /familial|pour enfants/ },
  { id: "history", label: "Historique", motif: /historique|moyen âge|péplum|époque|cape et d'épée/ },
  { id: "drama", label: "Drame", motif: /drame|dramatique|mélodrame/ },
];

// ce que chaque catégorie de sample apis apporte quand wikidata ne dit rien de plus précis
const GENRES_PAR_CATEGORIE = {
  "action-adventure": ["action", "adventure"],
  animation: ["animation"],
  classic: [],
  comedy: ["comedy"],
  drama: ["drama"],
  family: ["family"],
  horror: ["horror"],
  mystery: ["thriller", "crime"],
  "scifi-fantasy": ["science-fiction", "fantasy"],
  western: ["western"],
};

const NOMBRE_ACTEURS = 8;

// films retirés de l'api par l'équipe, par identifiant imdb
const FILMS_ECARTES = new Set(["tt0034583", "tt2267968", "tt0056172", "tt0029843", "tt0286244", "tt0053221"]);

const WIKIDATA = "https://query.wikidata.org/sparql";
const ENTETES = { "User-Agent": "moviemates-api/1.0 (projet etudiant)" };

// unités de durée utilisées par wikidata, converties en minutes
const MINUTES_PAR_UNITE = {
  "http://www.wikidata.org/entity/Q7727": 1,
  "http://www.wikidata.org/entity/Q25235": 60,
  "http://www.wikidata.org/entity/Q11574": 1 / 60,
};

async function lireJson(url, options) {
  const reponse = await fetch(url, options);
  if (!reponse.ok) throw new Error(`${url} : erreur HTTP ${reponse.status}`);
  return reponse.json();
}

// 1. tous les films de sample apis, regroupés par identifiant imdb
async function chargerSampleApis() {
  const films = new Map();
  for (const categorie of CATEGORIES) {
    const liste = await lireJson(`https://api.sampleapis.com/movies/${categorie}`, { headers: ENTETES });
    for (const film of liste) {
      if (!film.imdbId || FILMS_ECARTES.has(film.imdbId)) continue;
      const deja = films.get(film.imdbId);
      if (deja) {
        deja.categories.add(categorie);
      } else {
        films.set(film.imdbId, {
          imdbId: film.imdbId,
          titre: film.title,
          affiche: film.posterURL && film.posterURL !== "N/A" ? film.posterURL : null,
          categories: new Set([categorie]),
        });
      }
    }
  }
  return films;
}

// 2. wikidata : une requête pour les informations générales, une pour les genres, une pour les acteurs.
// les séparer évite de multiplier les lignes de résultat
function requeteInfos(valeurs) {
  return `
SELECT ?imdb ?film
  (SAMPLE(?titreFr) AS ?titre_fr)
  (SAMPLE(?titreOriginal) AS ?titre_original)
  (MIN(?date) AS ?sortie)
  (SAMPLE(?description) AS ?description_fr)
  (GROUP_CONCAT(DISTINCT CONCAT(STR(?duree), "@", STR(?unite)); separator="|") AS ?durees)
  (GROUP_CONCAT(DISTINCT ?nomReal; separator="|") AS ?realisateurs)
  (GROUP_CONCAT(DISTINCT ?nomPays; separator="|") AS ?pays)
WHERE {
  VALUES ?imdb { ${valeurs} }
  ?film wdt:P345 ?imdb .
  OPTIONAL { ?film rdfs:label ?titreFr FILTER(LANG(?titreFr) = "fr") }
  OPTIONAL { ?film wdt:P1476 ?titreOriginal }
  OPTIONAL { ?film wdt:P577 ?date }
  OPTIONAL { ?film schema:description ?description FILTER(LANG(?description) = "fr") }
  OPTIONAL { ?film p:P2047/psv:P2047 [ wikibase:quantityAmount ?duree; wikibase:quantityUnit ?unite ] }
  OPTIONAL {
    ?film wdt:P57 ?real .
    OPTIONAL { ?real rdfs:label ?realFr FILTER(LANG(?realFr) = "fr") }
    OPTIONAL { ?real rdfs:label ?realEn FILTER(LANG(?realEn) = "en") }
    BIND(COALESCE(?realFr, ?realEn) AS ?nomReal)
  }
  OPTIONAL {
    ?film wdt:P495 ?paysFilm .
    ?paysFilm rdfs:label ?nomPays FILTER(LANG(?nomPays) = "fr")
  }
}
GROUP BY ?imdb ?film`;
}

function requeteGenres(valeurs) {
  return `
SELECT ?imdb (GROUP_CONCAT(DISTINCT ?nomGenre; separator="|") AS ?genres)
WHERE {
  VALUES ?imdb { ${valeurs} }
  ?film wdt:P345 ?imdb ; wdt:P136 ?genre .
  ?genre rdfs:label ?nomGenre FILTER(LANG(?nomGenre) = "fr")
}
GROUP BY ?imdb`;
}

// acteurs et voix (films d'animation). la notoriété (nombre d'articles wikipédia) les classe
function requeteActeurs(valeurs) {
  return `
SELECT ?imdb (GROUP_CONCAT(DISTINCT CONCAT(STR(?notoriete), "@", ?nomActeur); separator="|") AS ?acteurs)
WHERE {
  VALUES ?imdb { ${valeurs} }
  ?film wdt:P345 ?imdb ; wdt:P161|wdt:P725 ?acteur .
  ?acteur wikibase:sitelinks ?notoriete .
  OPTIONAL { ?acteur rdfs:label ?acteurFr FILTER(LANG(?acteurFr) = "fr") }
  OPTIONAL { ?acteur rdfs:label ?acteurEn FILTER(LANG(?acteurEn) = "en") }
  BIND(COALESCE(?acteurFr, ?acteurEn) AS ?nomActeur)
  FILTER(BOUND(?nomActeur))
}
GROUP BY ?imdb`;
}

async function interrogerWikidata(requete) {
  const donnees = await lireJson(WIKIDATA, {
    method: "POST",
    headers: { ...ENTETES, Accept: "application/sparql-results+json" },
    body: new URLSearchParams({ query: requete }),
  });
  return donnees.results.bindings.map((ligne) =>
    Object.fromEntries(Object.entries(ligne).map(([cle, valeur]) => [cle, valeur.value])),
  );
}

const enListe = (texte) => (texte ? texte.split("|").filter(Boolean) : []);

async function chargerWikidata(identifiants) {
  const infos = new Map();
  // par paquets de 80 pour rester sous les limites du service
  for (let i = 0; i < identifiants.length; i += 80) {
    const valeurs = identifiants.slice(i, i + 80).map((id) => `"${id}"`).join(" ");

    for (const ligne of await interrogerWikidata(requeteInfos(valeurs))) {
      infos.set(ligne.imdb, {
        wikidata: ligne.film,
        titreFr: ligne.titre_fr ?? null,
        titreOriginal: ligne.titre_original ?? null,
        sortie: ligne.sortie ?? null,
        description: ligne.description_fr ?? null,
        durees: enListe(ligne.durees),
        realisateurs: enListe(ligne.realisateurs),
        pays: enListe(ligne.pays),
        genres: [],
        acteurs: [],
      });
    }
    for (const ligne of await interrogerWikidata(requeteGenres(valeurs))) {
      if (infos.has(ligne.imdb)) infos.get(ligne.imdb).genres = enListe(ligne.genres);
    }
    for (const ligne of await interrogerWikidata(requeteActeurs(valeurs))) {
      if (infos.has(ligne.imdb)) infos.get(ligne.imdb).acteurs = enListe(ligne.acteurs);
    }
  }
  return infos;
}

// la première durée exprimée dans une unité connue, en minutes
function enMinutes(durees) {
  for (const duree of durees) {
    const [quantite, unite] = duree.split("@");
    const facteur = MINUTES_PAR_UNITE[unite];
    if (facteur) return Math.round(Number(quantite) * facteur);
  }
  return null;
}

// les acteurs les plus connus d'abord
function tetesAffiche(acteurs) {
  return acteurs
    .map((acteur) => {
      const [notoriete, ...nom] = acteur.split("@");
      return { nom: nom.join("@"), notoriete: Number(notoriete) };
    })
    .sort((a, b) => b.notoriete - a.notoriete)
    .slice(0, NOMBRE_ACTEURS)
    .map((acteur) => acteur.nom);
}

// genres reconnus dans wikidata, complétés par la catégorie sample apis si besoin
function genresDuFilm(nomsWikidata, categories) {
  const trouves = new Set();
  for (const nom of nomsWikidata) {
    const texte = nom.toLowerCase();
    if (texte.startsWith("film live")) continue;
    for (const genre of GENRES) if (genre.motif.test(texte)) trouves.add(genre.id);
  }
  for (const categorie of categories) {
    const proposes = GENRES_PAR_CATEGORIE[categorie];
    // une catégorie double (action et aventure...) n'ajoute rien si wikidata a déjà précisé
    if (proposes.some((id) => trouves.has(id))) continue;
    if (proposes.length) trouves.add(proposes[0]);
  }
  return GENRES.map((genre) => genre.id).filter((id) => trouves.has(id));
}

// 3. vérifie que l'affiche répond vraiment, avec un second essai en cas d'échec passager
async function afficheDisponible(url) {
  for (const methode of ["HEAD", "GET"]) {
    try {
      const reponse = await fetch(url, { method: methode, headers: ENTETES });
      if (reponse.ok && (reponse.headers.get("content-type") ?? "").startsWith("image/")) return true;
      if (reponse.status === 404) return false;
    } catch {
      // erreur réseau : on retente avec la méthode suivante
    }
  }
  return false;
}

async function verifierAffiches(films) {
  const resultats = new Map();
  for (let i = 0; i < films.length; i += 10) {
    const paquet = films.slice(i, i + 10);
    const etats = await Promise.all(paquet.map((film) => afficheDisponible(film.affiche)));
    paquet.forEach((film, j) => resultats.set(film.imdbId, etats[j]));
  }
  return resultats;
}

async function construire() {
  const films = await chargerSampleApis();
  console.log(`sample apis : ${films.size} films distincts`);

  const avecAffiche = [...films.values()].filter((film) => film.affiche);
  const affichesOk = await verifierAffiches(avecAffiche);
  const gardes = avecAffiche.filter((film) => affichesOk.get(film.imdbId));
  console.log(`affiches : ${avecAffiche.length} annoncées, ${gardes.length} disponibles`);

  const infos = await chargerWikidata(gardes.map((film) => film.imdbId));
  console.log(`wikidata : ${infos.size} films retrouvés`);

  const movies = gardes.map((film) => {
    const wd = infos.get(film.imdbId);
    return {
      id: film.imdbId,
      title: wd?.titreFr ?? film.titre,
      original_title: wd?.titreOriginal ?? film.titre,
      year: wd?.sortie ? Number(wd.sortie.slice(0, 4)) : null,
      runtime_minutes: wd ? enMinutes(wd.durees) : null,
      genres: genresDuFilm(wd?.genres ?? [], film.categories),
      directors: wd?.realisateurs ?? [],
      cast: tetesAffiche(wd?.acteurs ?? []),
      countries: wd?.pays ?? [],
      description: wd?.description ?? null,
      poster_url: film.affiche,
      imdb_url: `https://www.imdb.com/title/${film.imdbId}/`,
      wikidata_url: wd?.wikidata ? wd.wikidata.replace("http://", "https://") : null,
    };
  });

  return movies.sort((a, b) => a.title.localeCompare(b.title, "fr"));
}

const movies = await construire();
const genres = GENRES.map(({ id, label }) => ({ id, label }));
await mkdir(DOSSIER_API, { recursive: true });
await writeFile(new URL("movies.json", DOSSIER_API), JSON.stringify(movies, null, 2) + "\n");
await writeFile(new URL("genres.json", DOSSIER_API), JSON.stringify(genres, null, 2) + "\n");
console.log(`${movies.length} films écrits dans api/movies.json`);
