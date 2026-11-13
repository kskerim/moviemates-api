# moviemates-api

API de films du projet MovieMates. Ce sont des fichiers JSON statiques publiés avec GitHub Pages : gratuits, sans clé, lisibles par n'importe quelle application.

## adresses

| fichier | contenu |
| --- | --- |
| `api/movies.json` | les 401 films, triés par titre |
| `api/genres.json` | les 19 genres, avec leur libellé en français |
| `api/3/…` | les mêmes films au format TMDB v3, voir [format tmdb](#format-tmdb-api3) |

Une fois le dépôt publié, les adresses sont de la forme `https://<compte>.github.io/moviemates-api/api/movies.json`.

## un film

```json
{
  "id": "tt0068646",
  "title": "Le Parrain",
  "original_title": "The Godfather",
  "year": 1972,
  "runtime_minutes": 175,
  "genres": ["crime", "thriller", "history", "drama"],
  "directors": ["Francis Ford Coppola"],
  "cast": ["Marlon Brando", "Al Pacino", "Diane Keaton", "Robert Duvall", "James Caan", "Sofia Coppola", "Talia Shire", "John Cazale"],
  "countries": ["États-Unis", "Italie"],
  "description": "film de Francis Ford Coppola, sorti en 1972",
  "poster_url": "https://m.media-amazon.com/images/M/...jpg",
  "imdb_url": "https://www.imdb.com/title/tt0068646/",
  "wikidata_url": "https://www.wikidata.org/entity/Q47703"
}
```

| champ | type | remarque |
| --- | --- | --- |
| `id` | texte | identifiant IMDb, unique |
| `title` | texte | titre français, ou titre anglais s'il n'y en a pas |
| `original_title` | texte | titre dans la langue d'origine |
| `year` | nombre ou `null` | année de la première sortie |
| `runtime_minutes` | nombre ou `null` | durée en minutes |
| `genres` | liste d'identifiants | au moins un, du plus précis au plus large, voir `api/genres.json` |
| `directors` | liste de textes | peut être vide |
| `cast` | liste de textes | jusqu'à 8 acteurs ou voix, les plus connus d'abord, peut être vide |
| `countries` | liste de textes | pays d'origine, peut être vide |
| `description` | texte ou `null` | courte description en français |
| `poster_url` | texte | adresse de l'affiche, vérifiée à la construction |
| `imdb_url` | texte | page du film sur IMDb |
| `wikidata_url` | texte ou `null` | fiche du film sur Wikidata |

Un même film peut appartenir à plusieurs genres.

## genres

`animation`, `western`, `horror`, `science-fiction`, `fantasy`, `war`, `musical`, `biopic`, `documentary`, `sport`, `crime`, `thriller`, `action`, `adventure`, `romance`, `comedy`, `family`, `history`, `drama`.

Les genres viennent du classement de Wikidata. La catégorie de Sample APIs complète quand Wikidata ne donne rien de précis.

## format tmdb (`api/3/`)

Les mêmes films sont aussi publiés avec la forme des réponses de [TMDB v3](https://developer.themoviedb.org/reference). Une app écrite pour TMDB n'a qu'à changer son adresse de base et la forme de ses adresses.

GitHub Pages ne lit pas les paramètres (`?page=`, `?query=`) : chaque réponse est un fichier `.json`, la clé d'API est inutile.

| tmdb | ici | contenu |
| --- | --- | --- |
| `/discover/movie?page={n}` | `api/3/discover/movie/{n}.json` | 20 films par page, 21 pages, par titre |
| `/discover/movie` | `api/3/discover/movie.json` | la page 1 |
| `/search/movie?query=…` | `api/3/discover/movie/all.json` | pas de recherche côté serveur : les 401 films en une réponse, à filtrer dans l'app |
| `/movie/{id}` | `api/3/movie/{id}.json` | le détail ; un identifiant inconnu renvoie une 404 |
| `/movie/{id}/credits` | `api/3/movie/{id}/credits.json` | acteurs (`cast`) et réalisateurs (`crew`, `job: "Director"`) |
| `/genre/movie/list` | `api/3/genre/movie/list.json` | les 17 genres TMDB présents |
| `https://image.tmdb.org/t/p/w500{poster_path}` | `https://m.media-amazon.com/images/M{poster_path}` | l'affiche |

Adresse de base : `https://kskerim.github.io/moviemates-api/api/3`.

Différences avec TMDB :

- `id` est le numéro IMDb sans `tt` (`tt0068646` → `68646`) ; l'identifiant IMDb complet est dans `imdb_id` du détail.
- `release_date` vaut `AAAA-01-01` : seule l'année est connue. `""` si elle manque.
- `vote_average` et `vote_count` valent `0` : les sources n'ont pas de note.
- `overview` est la courte description Wikidata (une ligne), `""` si elle manque ; `runtime` peut être `null`.
- `biopic` et `sport` n'existent pas chez TMDB : ces films sont classés Drame.
- `poster_path` n'est jamais `null`.

## sources

- [Sample APIs](https://sampleapis.com/api-list/movies) : la liste des films par catégorie, les titres, les identifiants IMDb et les adresses des affiches.
- [Wikidata](https://www.wikidata.org) : titres français et originaux, années, durées, genres, réalisateurs, acteurs, pays et descriptions. Données sous licence CC0.
- Les affiches sont hébergées par IMDb. Le dépôt ne contient que leurs adresses, pas les images.

Les films dont l'affiche ne répondait plus au moment de la construction sont écartés.

## reconstruire les données

Avec Node.js 18 ou plus récent :

```
node scripts/construire.mjs
```

Le script interroge Sample APIs puis Wikidata, vérifie chaque affiche et réécrit les deux fichiers de `api/`, puis le dossier `api/3/`.

Pour ne régénérer que `api/3/` à partir de `api/movies.json`, sans réseau :

```
node scripts/tmdb.mjs
```
