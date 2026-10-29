# moviemates-api

API de films du projet MovieMates. Ce sont des fichiers JSON statiques publiés avec GitHub Pages : gratuits, sans clé, lisibles par n'importe quelle application.

## adresses

| fichier | contenu |
| --- | --- |
| `api/movies.json` | les 401 films, triés par titre |
| `api/genres.json` | les 19 genres, avec leur libellé en français |

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

Le script interroge Sample APIs puis Wikidata, vérifie chaque affiche et réécrit les deux fichiers de `api/`.
