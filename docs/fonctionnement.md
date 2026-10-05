# Comment fonctionne fiss-studio

fiss-studio fabrique les images de partage de fiss.dev : les **cartes OG** (l'aperçu qui s'affiche quand on colle un lien sur Discord, LinkedIn, X…) et les **miniatures** façon YouTube. Il vit dans son propre dépôt pour que le site ne contienne que du site, mais il ne sait rien de fiss.dev : couleurs, polices, mascotte et textes lui sont toujours passés en paramètres.

Il a deux moitiés qui ne fonctionnent pas du tout pareil :

| | Cartes OG | Miniatures |
|---|---|---|
| Point d'entrée | `fiss-studio/og` (bibliothèque) | `fiss-thumbs` (commande) |
| Quand | à chaque `bun run build` du site | quand tu le lances, sur ta machine |
| Moteur | Satori + resvg (JavaScript pur) | Chrome headless |
| Réseau | aucun | Openverse, Danbooru, MangaDex, Simple Icons |
| Résultat | dans `dist/`, jamais commité | dans `public/thumbs/`, commité avec le post |
| Taille | 1200 × 630 | 1280 × 720 |

---

## 1. Le dépôt

```
fiss-studio/
  og/
    index.js        renderOg() : la carte OG
    avatar.js       avatarSvg() / avatarMarkup() : la mascotte en SVG
    *.d.ts          types TypeScript (pour astro check)
    grain.png       texture de grain incrustée dans les cartes
  thumbs/
    cli.js          la commande fiss-thumbs (render, pick, setup)
    render.js       rendu d'une miniature, lecture des posts
    template.html   le gabarit des miniatures (styles loud et calm)
    env.js          cache, Chrome, téléchargements
    pick.js         planche de choix des personnages
    setup.js        installation de rembg
    sources/        une source d'images par fichier
  fonts/            Fraunces et IBM Plex Mono (licence OFL)
  test/             tests (bun test), lancés en CI à chaque push
```

Pas d'étape de build : le code est publié tel quel. C'est voulu, parce que fiss.dev installe le paquet directement depuis GitHub, et une dépendance git n'est pas compilée à l'installation.

---

## 2. Les cartes OG

### Le chemin d'une carte

```
bun run build (fiss.dev)
  └─ src/pages/og/[...slug].jpg.ts        une page par post + "index"
       ├─ avatarSvg(ombre.avatar.json, "curious-left", couleurs)
       │     └─ avatar-core calcule la géométrie d'Ombre → SVG
       └─ renderOg({ title, kicker, mascot })
             ├─ Satori : arbre HTML/CSS → SVG (avec les polices embarquées)
             ├─ resvg  : SVG → PNG
             └─ sharp  : PNG → JPEG (~60 Ko)
  → dist/og/index.jpg, dist/og/lab/<id>.jpg, dist/og/writing/<id>.jpg
```

Comme c'est une route Astro, la carte d'un nouveau post existe dès que le post existe : rien à lancer, rien à commiter, rien à vérifier en CI.

### Ce que fait renderOg

`renderOg()` reçoit un titre, un kicker facultatif (la petite ligne mono au-dessus), une mascotte en SVG et un thème de cinq couleurs (`ink`, `pigment`, `lit`, `halo`, `paper`). Il compose :

- le fond : l'encre, trois halos en dégradé radial et la texture de grain ;
- la mascotte au centre ;
- le kicker en IBM Plex Mono ;
- le titre en Fraunces. Les mots entre `*astérisques*` passent en couleur `halo`.

Le titre se compose mot par mot avec un espacement explicite, parce que Satori supprime les espaces en bord de bloc. Au-delà de 38 caractères, le titre et la mascotte rétrécissent pour tenir.

### Pourquoi Satori et pas Chrome

Satori et resvg tournent partout où tourne Node : sur ta machine, dans la CI GitHub, et dans le conteneur Alpine ARM64 du Pi (resvg y a un binaire précompilé). Chrome, lui, n'a rien à faire dans un build de site. La contrepartie : Satori ne gère qu'une partie du CSS (pas de filtres, pas de modes de fusion, pas de bruit). C'est pour ça que le grain est une image, et que les miniatures, qui ont besoin de tout ça, passent par Chrome.

### Les deux pièges déjà corrigés

- **Les piques coupées.** Les piques d'Ombre dépassent du cadre de la définition (−150 à 150). Un navigateur les laisse dépasser, resvg les coupe. `avatarSvg` utilise donc un cadre plus large (−195 à 195).
- **Les polices.** Satori ne lit pas le woff2 du site. Le paquet embarque donc ses propres fichiers woff.

---

## 3. Les miniatures

### Le chemin d'une miniature

```
bun run thumbs (fiss.dev)
  = fiss-thumbs render --content src/content --out public/thumbs --avatar ombre.avatar.json
  └─ pour chaque post qui a un bloc thumb: dans son front matter
       ├─ bg: "search:…"          → Openverse : une photo CC0, réduite à 1600 px
       ├─ character: danbooru:…   → Danbooru : une illustration, détourée par rembg
       ├─ manga: { title, … }     → MangaDex : une couverture
       ├─ ombre: <expression>     → avatarMarkup() : Ombre, avec un contour
       ├─ logos: [...]            → Simple Icons : les SVG des logos
       ├─ tout est injecté dans template.html
       ├─ Chrome headless fait la capture en 1280 × 720
       └─ sharp → JPEG
  → public/thumbs/<shelf>/<id>.jpg + public/thumbs/credits.json
```

### Le bloc thumb

```yaml
thumb:
  style: loud                        # loud (criard) ou calm (tenu)
  hook: NO BS                        # loud : l'accroche encadrée en haut
  kicker: Lab · Sep 2026             # calm : la ligne mono ; par défaut rubrique · mois
  punch: VAULTWARDEN                 # le gros texte, ajusté à sa boîte
  ombre: suspicious-right            # une expression d'Ombre…
  character: danbooru:yagami_light   # …ou un personnage détouré, ou un chemin vers un PNG
  characterPost: 12303264            # fige l'illustration (voir pick)
  manga: { title: Death Note, volume: 1 }   # …ou une couverture en affiche
  logos: [bitwarden, docker]
  bg: "search:server rack"           # ou un chemin vers une image
  bgPick: 0
```

Seul `punch` est obligatoire. Côté fiss.dev, ce bloc fait partie du schéma des posts (`content.config.ts`) : une faute de frappe fait échouer le build.

### Le gabarit

`template.html` est une page HTML ordinaire. Le script de rendu y injecte un objet `window.SPEC` (textes, SVG d'Ombre, SVG des logos, chemins des images), et la page se construit à partir de là. C'est du CSS complet, puisque c'est Chrome qui rend :

- **loud** : fond encre, photo de fond passée en IKB par multiplication, accroche encadrée, gros texte avec un contour noir et une ombre IKB, personnage ou Ombre avec un contour craie façon sticker, logos dans des pastilles ;
- **calm** : aplat IKB, photo en filigrane, kicker mono, gros texte craie, Ombre ou le personnage à droite, logos en ligne.

Le gros texte rétrécit automatiquement jusqu'à tenir dans sa boîte. Une couverture de manga est affichée comme une carte inclinée, passée en bichromie encre/IKB par un filtre SVG (sauf avec `tint: false`).

### Les sources

| Source | Ce qu'elle fournit | Comment |
|---|---|---|
| **Openverse** | photos de fond | recherche filtrée sur CC0 et domaine public, format large ; aucune clé d'API |
| **Danbooru** | personnages | deux tags maximum sans compte : `<personnage> simple_background`, puis filtrage local (tous publics, `solo`, ≥ 900 px de haut). Détourage par `rembg` avec le modèle `isnet-anime` |
| **MangaDex** | couvertures | recherche du titre, couverture du volume demandé, édition japonaise par défaut ; une requête toutes les 250 ms au plus |
| **Simple Icons** | logos | SVG par nom (`docker`, `bitwarden`…), en CC0 |

Chaque image téléchargée est mise en cache. La source, la licence et l'auteur sont notés dans `credits.json`.

### Le cache

Tout ce qui est lent ou téléchargé vit dans `~/.cache/fiss-studio` (ou `FISS_STUDIO_CACHE`) :

```
~/.cache/fiss-studio/
  venv/          rembg, installé par fiss-thumbs setup
  models/        le modèle isnet-anime (~170 Mo)
  backgrounds/   photos Openverse
  characters/    personnages déjà détourés
  manga/         couvertures
  icons/         logos
```

Le premier rendu d'un post prend jusqu'à une minute (téléchargement, détourage). Les suivants prennent quelques secondes. Le cache est hors des deux dépôts : rien ne finit dans git par erreur, et les deux projets le partagent. On peut le supprimer sans risque : tout se retélécharge, sauf que `characterPick` peut alors tomber sur une autre image (voir plus bas).

### Les commandes

```bash
fiss-thumbs setup                  # une fois : installe rembg dans le cache
fiss-thumbs render --content … --out … --avatar …   # tous les posts
fiss-thumbs render … --only setup-vaultwarden       # un seul post
fiss-thumbs render --spec spec.json --out test.jpg  # une miniature isolée
fiss-thumbs pick yagami_light      # planche des candidats Danbooru
```

`pick` produit `pick-<tag>.png` : 16 illustrations, chacune avec son identifiant `characterPost`.

### characterPick contre characterPost

Danbooru renvoie les illustrations de la plus récente à la plus ancienne. `characterPick: 0` désigne donc « la plus récente du moment », qui change dès qu'un artiste publie. `characterPost: <id>` désigne une illustration précise, pour toujours. **Utilise toujours `characterPost` dans un post publié.** `characterPick` ne sert qu'à explorer.

Le même risque existe en plus faible pour `bgPick` (Openverse). Le cache protège tant qu'il n'est pas vidé, et `credits.json` garde la source exacte de chaque image.

---

## 4. Le branchement dans fiss.dev

```json
"dependencies": { "fiss-studio": "github:0LrNx/fiss-studio#v0.2.1" },
"scripts": { "thumbs": "fiss-thumbs render --content src/content --out public/thumbs --avatar src/components/ombre/ombre.avatar.json" }
```

Ce que fiss.dev fait des images :

- **`src/pages/og/[...slug].jpg.ts`** génère une carte par post, plus `og/index.jpg` pour le site ;
- **`Article.astro`** prend comme image de partage la miniature du post si elle existe (1280 × 720), sinon sa carte générée (1200 × 630) ;
- **`PostList.astro`** affiche la miniature comme vignette dans les listes, sinon le `cover` du post ;
- **la CI** échoue si un post a un bloc `thumb:` mais pas d'image dans `public/thumbs/`.

### Écrire un post avec une miniature

1. Écrire le post, avec son bloc `thumb:`.
2. Pour un personnage : `bunx fiss-thumbs pick <tag>`, choisir, noter le `characterPost`.
3. `bun run thumbs`.
4. Commiter le post, l'image et `credits.json` ensemble, puis ouvrir la PR.

---

## 5. Faire évoluer l'outil

Le site est épinglé sur un tag : une modification de fiss-studio ne l'atteint que quand tu changes ce tag.

**Tester une modification dans fiss.dev avant de la publier :**

```bash
cd fiss.dev
bun add ../fiss-studio          # pointe temporairement sur la copie locale
bun run build                   # ou bun run thumbs
bun add github:0LrNx/fiss-studio#v0.2.1   # revenir au tag publié
```

**Publier une version :**

1. Modifier, puis `bun test`.
2. Monter la version dans `package.json` : correctif `0.2.x`, ajout `0.x.0`.
3. Commiter, `git tag v0.2.2`, `git push origin main v0.2.2`.
4. Attendre la CI verte de fiss-studio.
5. Dans fiss.dev : `bun add github:0LrNx/fiss-studio#v0.2.2`, puis une PR comme d'habitude.

La CI de fiss-studio lance les tests sur Ubuntu, rendu dans Chrome compris. Elle ne teste ni le réseau ni `rembg` : le test des miniatures utilise un personnage factice généré en local.

---

## 6. Dépendances et prérequis

| | Cartes OG | Miniatures |
|---|---|---|
| Node / Bun | oui | oui |
| `satori`, `@resvg/resvg-js`, `sharp` | oui (installés avec le paquet) | `sharp` |
| `@bible-strong/avatar-core` | pour la mascotte (fourni par le site) | pour `ombre:` |
| Chrome | non | oui (`CHROME` pour un autre chemin) |
| Python 3 + `rembg` | non | pour `character: danbooru:…` |
| Réseau | non | à la première récupération de chaque image |

ImageMagick n'est plus nécessaire depuis la `v0.2.1` : tout le traitement d'image passe par `sharp`.

---

## 7. Limites connues

- **Les droits.** Les personnages Danbooru et les couvertures MangaDex sont des œuvres protégées. Les photos Openverse sont libres (CC0) et les logos Simple Icons aussi. Les crédits de chaque image sont dans `credits.json`.
- **Le placement est fixe.** Les logos peuvent chevaucher un personnage ; le gabarit n'adapte pas encore la composition à la silhouette.
- **Les miniatures ne se font pas en CI.** C'est le choix actuel (option A) : tu les génères et tu les commites. Les générer automatiquement sur les PR reste possible plus tard, sans changer l'outil.
- **Dans les listes, la miniature est toute petite** (52 × 35 px) et recadrée en 3:2. Elle se lit surtout en grand, comme carte de partage.
