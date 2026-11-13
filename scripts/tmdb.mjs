// construit api/3/ : les mêmes films que api/movies.json, mais avec la forme des réponses de tmdb v3.
// github pages ne lit pas les paramètres d'adresse (?page=, ?query=) : chaque réponse est un fichier .json.
// lancement : node scripts/tmdb.mjs (appelé aussi à la fin de scripts/construire.mjs)

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

const DOSSIER_API = new URL("../api/", import.meta.url);
const DOSSIER_TMDB = new URL("3/", DOSSIER_API);
const PAR_PAGE = 20;
const BASE_AFFICHES = "https://m.media-amazon.com/images/M";

// genres de l'api → genres tmdb (identifiants et libellés français de tmdb).
// biopic et sport n'existent pas chez tmdb : ils deviennent drame
const GENRES_TMDB = {
  action: { id: 28, name: "Action" },
  adventure: { id: 12, name: "Aventure" },
  animation: { id: 16, name: "Animation" },
  comedy: { id: 35, name: "Comédie" },
  crime: { id: 80, name: "Crime" },
  documentary: { id: 99, name: "Documentaire" },
  drama: { id: 18, name: "Drame" },
  biopic: { id: 18, name: "Drame" },
  sport: { id: 18, name: "Drame" },
  family: { id: 10751, name: "Familial" },
  fantasy: { id: 14, name: "Fantastique" },
  history: { id: 36, name: "Histoire" },
  horror: { id: 27, name: "Horreur" },
  musical: { id: 10402, name: "Musique" },
  romance: { id: 10749, name: "Romance" },
  "science-fiction": { id: 878, name: "Science-Fiction" },
  thriller: { id: 53, name: "Thriller" },
  war: { id: 10752, name: "Guerre" },
  western: { id: 37, name: "Western" },
};

// "tt0068646" → 68646 : tmdb utilise des identifiants numériques
const versId = (imdbId) => Number(imdbId.slice(2));

function genresTmdb(genres) {
  const vus = new Map();
  for (const g of genres) {
    const tmdb = GENRES_TMDB[g];
    if (!tmdb) throw new Error(`genre sans équivalent tmdb : ${g}`);
    vus.set(tmdb.id, tmdb);
  }
  return [...vus.values()];
}

function cheminAffiche(url) {
  if (!url?.startsWith(BASE_AFFICHES + "/")) throw new Error(`affiche hors de ${BASE_AFFICHES} : ${url}`);
  return url.slice(BASE_AFFICHES.length);
}

// seule l'année est connue : tmdb attend "AAAA-MM-JJ", on met le 1er janvier ("" si l'année manque)
const dateSortie = (year) => (year ? `${year}-01-01` : "");

// un film dans une liste (discover, search)
function versResultat(m) {
  return {
    id: versId(m.id),
    title: m.title,
    original_title: m.original_title,
    release_date: dateSortie(m.year),
    genre_ids: genresTmdb(m.genres).map((g) => g.id),
    overview: m.description ?? "",
    poster_path: cheminAffiche(m.poster_url),
    vote_average: 0, // pas de note dans les sources : 0 comme un film sans vote chez tmdb
    vote_count: 0,
  };
}

// le détail d'un film (movie/{id})
function versDetail(m) {
  const { genre_ids, ...resultat } = versResultat(m);
  return {
    ...resultat,
    imdb_id: m.id,
    genres: genresTmdb(m.genres),
    runtime: m.runtime_minutes,
    production_countries: m.countries.map((name) => ({ name })),
    homepage: m.imdb_url,
  };
}

// les crédits d'un film (movie/{id}/credits)
function versCredits(m) {
  return {
    id: versId(m.id),
    cast: m.cast.map((name, order) => ({ name, order })),
    crew: m.directors.map((name) => ({ name, job: "Director", department: "Directing" })),
  };
}

const page = (n, results, total) => ({
  page: n,
  results,
  total_pages: Math.max(1, Math.ceil(total / PAR_PAGE)),
  total_results: total,
});

const ecrire = async (chemin, donnees) => {
  const url = new URL(chemin, DOSSIER_TMDB);
  await mkdir(new URL(".", url), { recursive: true });
  await writeFile(url, JSON.stringify(donnees) + "\n");
};

const movies = JSON.parse(await readFile(new URL("movies.json", DOSSIER_API), "utf8"));
const ids = new Set(movies.map((m) => versId(m.id)));
if (ids.size !== movies.length) throw new Error("deux films ont le même identifiant numérique");

await rm(DOSSIER_TMDB, { recursive: true, force: true });

// discover : une page de 20 films par fichier, dans l'ordre de movies.json (par titre)
const resultats = movies.map(versResultat);
const nbPages = Math.ceil(resultats.length / PAR_PAGE);
for (let n = 1; n <= nbPages; n++) {
  const contenu = page(n, resultats.slice((n - 1) * PAR_PAGE, n * PAR_PAGE), resultats.length);
  await ecrire(`discover/movie/${n}.json`, contenu);
  if (n === 1) await ecrire("discover/movie.json", contenu);
}
// tous les films en une réponse : sert à la recherche, faite dans l'app
await ecrire("discover/movie/all.json", { ...page(1, resultats, resultats.length), total_pages: 1 });

// détail et crédits
for (const m of movies) {
  await ecrire(`movie/${versId(m.id)}.json`, versDetail(m));
  await ecrire(`movie/${versId(m.id)}/credits.json`, versCredits(m));
}

// genres réellement présents, triés par nom comme chez tmdb
const genresUtilises = new Map(movies.flatMap((m) => genresTmdb(m.genres)).map((g) => [g.id, g]));
await ecrire("genre/movie/list.json", {
  genres: [...genresUtilises.values()].sort((a, b) => a.name.localeCompare(b.name, "fr")),
});

console.log(`api/3 : ${nbPages} pages, ${movies.length} films, ${genresUtilises.size} genres`);
