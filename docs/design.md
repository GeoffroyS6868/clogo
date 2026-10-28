# c-logo — conception

Créateur de logo : on choisit une à trois formes, elles sont répliquées selon une disposition (rond, grille, triangle ou rayons), on règle quelques curseurs et les couleurs, on peut passer le tout au filtre pixels ou hexagones, et on exporte le logo en SVG ou en PNG.

## Principes

- Une seule vue, plein écran (`h-dvh`, `overflow: hidden`), aucun scroll de page.
- **L'interface** est monochrome noir/blanc : couleurs uniquement via les tokens Nuxt UI (`bg-default`, `bg-elevated`, `text-highlighted`, `text-muted`, `border-default`…). Clair et sombre suivent le système. **Le logo**, lui, peut avoir ses propres couleurs (voir Couleurs) ; sans couleur choisie, il est dessiné en `currentColor`.
- Composants Nuxt UI autorisés : `UApp` (racine), `UButton`, `USlider`. Rien d'autre. Les couleurs passent par l'`<input type="color">` natif.
- Données 100 % locales (`localStorage`), rien n'est envoyé.
- La géométrie est une **fonction pure de la configuration** : l'écran et l'export lisent le même résultat, il n'y a pas d'état caché dans le DOM. (Le filtre a besoin de savoir si un point est dans un chemin : ce test lui est passé en paramètre, la fonction reste pure.)
- **Ajouter sans surcharger** :
  1. un réglage n'apparaît que s'il a un effet (« Arrondi » seulement avec une forme à angles, « Branches » seulement en rayons…) ;
  2. le panneau est découpé en trois onglets courts (Forme, Disposition, Rendu), l'en-tête et l'export restent toujours visibles ;
  3. une variante d'un réglage existant vaut mieux qu'un nouveau réglage (la croix est une étoile à 4 branches, pas une disposition de plus).

## Modèle

```ts
type ShapeId = 'circle' | 'square' | 'polygon' | 'diamond' | 'star' | 'petal' | 'bar' | 'arc' | 'cross' | 'glyph'
type Layout = 'circle' | 'grid' | 'triangle' | 'rays'
type Paint = 'fill' | 'stroke'
type Filter = 'none' | 'pixel' | 'hex'

interface ShapeSlot {
  id: ShapeId
  color: string | null // '#rrggbb', null = couleur automatique (currentColor)
  count?: number       // étoile : branches 3–12 ; polygone : côtés 3–8 ; croix : bras 2–8. Présent seulement pour ces trois formes
  char?: string        // caractère : un seul caractère de GLYPHS. Présent seulement pour 'glyph'
}

interface Logo {
  shapes: ShapeSlot[]   // 1–3 formes, sans doublon, dans l'ordre de sélection
  layout: Layout
  circleCount: number   // rond : copies, 2–24 (multiple du nombre de formes)
  gridSize: number      // grille : copies par côté, 2–6
  triangleRows: number  // triangle : rangées, 2–6
  rayCount: number      // rayons : branches, 2–12
  rayLength: number     // rayons : copies par branche, 1–6
  spread: number        // 0–1 : écartement des copies
  size: number          // 0.1–1 : taille de chaque forme
  rotation: number      // 0–360° : rotation de base de chaque forme
  twist: number         // −180–180° : rotation ajoutée de copie en copie
  scale: number         // 0.5–1.5 : échelle de tout le logo, par-dessus le cadrage automatique
  paint: Paint          // plein ou contour
  corner: number        // 0–1 : arrondi des angles
  smooth: boolean       // coins lissés (squircle) plutôt que circulaires
  background: string | null // '#rrggbb', null = transparent
  filter: Filter        // aucun, pixels ou hexagones
  cells: number         // 8–64 : cellules sur la largeur du cadre
  gap: number           // 0–0.5 : espacement entre cellules (fraction de la cellule)
}
```

Le nombre de copies de chaque disposition est un champ à part : changer de disposition puis revenir retrouve le réglage d'avant. La couleur, le nombre de branches et le caractère sont portés par la forme (`ShapeSlot`) : ils la suivent si l'ordre change, et deux formes réglables gardent chacune leur réglage.

Défaut : une fleur.

```ts
{
  shapes: [{ id: 'petal', color: null }], layout: 'circle',
  circleCount: 8, gridSize: 3, triangleRows: 3, rayCount: 6, rayLength: 3,
  spread: 0.6, size: 0.5, rotation: 0, twist: 0,
  paint: 'fill', corner: 0, smooth: false, background: null,
  filter: 'none', cells: 24, gap: 0
}
```

Stocké sous la clé `c-logo:logo:v1` (objet JSON). Lecture au montage côté client uniquement (la page est prérendue). Chaque champ est validé (type, bornes, couleurs au format `/^#[0-9a-f]{6}$/i`) ; `circleCount` est ensuite ramené au multiple du nombre de formes ; un champ invalide ou absent prend sa valeur par défaut, champ par champ. `shapes` est valide s'il contient 1 à 3 entrées valides sans doublon, sinon il prend sa valeur par défaut. Écriture à chaque changement.

**Anciennes données** (logo courant et designs de la galerie, lus par le même `parseLogo`) : une forme `triangle` devient `{ id: 'polygon', count: 3 }` (même dessin) ; une `star` sans `count` devient une étoile à **4** branches (le dessin d'avant) ; un `count` hors bornes ou absent sur une forme réglable prend la valeur par défaut de la forme ; un `char` absent ou inconnu devient `'A'`. Une étoile ajoutée depuis la grille, elle, a 5 branches.

## Formes

`app/utils/shapes.ts`. Toutes les formes sont dans la boîte unité `[-50, 50]²`, centrées sur l'origine, **pointant vers le haut** (−y). `radius` = rayon du cercle englobant depuis l'origine (sert au cadrage).

Trois familles :

- **À angles** : décrites par leurs sommets (dans le sens horaire), fixes ou **calculés d'après `count`** (étoile, polygone, croix). Le chemin est calculé par `shapePath`, avec l'arrondi.
- **Courbes** : un chemin fixe (`d`), insensible à l'arrondi.
- **Caractère** : le contour d'un caractère, pris dans `GLYPHS` ; insensible à l'arrondi.

| id | label | famille | dessin |
|---|---|---|---|
| `circle` | Cercle | courbe | disque de rayon 50 |
| `square` | Carré | angles | carré 100 × 100 (`radius` ≈ 70,7) |
| `polygon` | Polygone | angles, `count` = côtés 3–8, défaut 3 | polygone régulier inscrit dans le cercle de rayon 50, un sommet en haut (`count = 3` : l'ancien triangle, sommets (0,−50) (43,3,25) (−43,3,25) ; identique à l'ancien chemin à `corner = 0`, à 0,01 près quand les angles sont arrondis, les anciens sommets étant arrondis à 43,3) |
| `diamond` | Losange | angles | sommets (0,−50) (32,0) (0,50) (−32,0) |
| `star` | Étoile | angles, `count` = branches 3–12, défaut 5 | `2·count` sommets alternés, pointes au rayon 50 (une en haut), creux au rayon `50 · r(count)` |
| `petal` | Pétale | courbe | amande verticale : deux arcs de (0,−50) à (0,50), largeur max 56 |
| `bar` | Barre | angles | rectangle 24 × 100 (`radius` ≈ 51,4) |
| `arc` | Arc | courbe | demi-anneau ouvert vers le bas, rayons 50 et 26, descendu de 25 pour centrer sa boîte (`radius` ≈ 55,9) |
| `cross` | Croix | angles, `count` = bras 2–8, défaut 4 | `count` bras de largeur 24 partant du centre jusqu'au rayon 50 (`radius` = hypot(50, 12) ≈ 51,4), un bras vers le haut ; 2 bras = une barre, 4 = « + », 3 = Y, 6 = astérisque |
| `glyph` | Caractère | caractère, `char` (défaut `A`) | le caractère, centré sur sa boîte englobante (pas sur sa ligne de base : un « g » est au milieu), mis à l'échelle pour que son plus grand côté fasse 100 |

**Étoile.** Rapport des creux `r(n) = n ≤ 4 ? 0.28 : 0.382 + 0.02 · (n − 5)` : à 4 branches, l'étoile d'avant (creux à 9,9·√2 ≈ 14) ; à 5, l'étoile classique (0,382) ; les creux s'ouvrent un peu quand les branches se multiplient (0,52 à 12) pour que les branches restent lisibles.

**Croix.** Pour `n` bras d'angles `θ_k = −90° + k · 360°/n`, de direction `u_k` et de normale `v_k` (vers la droite du bras, sens horaire) : sommets, pour chaque bras dans l'ordre, `50·u_k − 12·v_k`, `50·u_k + 12·v_k`, puis le coin rentrant entre ce bras et le suivant, sur leur bissectrice à la distance `12 / sin(π/n)` du centre. À 2 bras, ce coin rentrant tombe au milieu des grands côtés (sommets alignés : l'arrondi les laisse tels quels).

L'ordre du tableau est celui de `SHAPE_IDS`, donc des boutons de l'onglet Forme (5 par ligne : cercle, carré, polygone, losange, étoile / pétale, barre, arc, croix, caractère).

**Caractère.** `app/utils/glyphs.ts` est **généré** (pas écrit à la main) par `scripts/glyphs.mjs` (`pnpm glyphs`) depuis une police libre (OFL) en graisse grasse — Inter Bold, le fichier `.woff` du paquet `@fontsource/inter` (`inter-latin-700-normal.woff`) —, lue avec `opentype.js` (deux dépendances de développement seulement : rien n'est chargé dans l'app à l'exécution). Il exporte `GLYPHS: Record<string, { d: string, radius: number }>` pour les caractères ASCII imprimables `!` à `~` (94 caractères : lettres, chiffres, ponctuation, `& @ # % + * ?`…), chaque chemin déjà centré et mis à l'échelle comme décrit plus haut, nombres arrondis à 2 décimales, `radius` = distance maximale d'un point du contour à l'origine, arrondie au centième supérieur. Les courbes restent des quadratiques (`Q`, celles de la police) ; la police laisse ses contours ouverts, le script les ferme (`Z`) pour que le mode contour les referme aussi. Seul le contour tient dans `[-50, 50]` : un point de contrôle de quadratique peut le dépasser un peu (50,34 au pire, pour `~`). Les trous (« o », « g ») suivent les sens de tracé de la police : remplissage `nonzero`, le défaut. La licence de la police est rappelée en tête du fichier généré et dans le README.

```ts
interface Shape { label: string, radius: number | ((slot: ShapeSlot) => number), points?: Point[] | ((count: number) => Point[]), d?: string }
const SHAPES: Record<ShapeId, Shape>
const SHAPE_IDS: ShapeId[]                       // ordre d'affichage
const SHAPE_COUNT: Partial<Record<ShapeId, { label: string, min: number, max: number, default: number }>>
                                                 // star : « Branches » 3–12 (5) ; polygon : « Côtés » 3–8 (3) ; cross : « Bras » 2–8 (4)
function isAngular(id: ShapeId): boolean         // a des sommets
function newSlot(id: ShapeId): ShapeSlot         // avec count / char par défaut, color null
const DEFAULT_CHAR = 'A'
function shapeRadius(slot: ShapeSlot): number
function shapePath(slot: ShapeSlot, corner: number, smooth: boolean): string
```

Tous les appels qui passaient un `id` (aperçu, mosaïque, export, cadrage, mini-SVG des boutons, onglet Rendu) passent désormais la `ShapeSlot`.

### Arrondi des angles

Calculé dans le chemin lui-même (pas de CSS, pas de `stroke-linejoin`) : l'export reste un simple `<path>`, lisible par n'importe quel éditeur.

Pour chaque sommet `P`, de voisins `A` (précédent) et `B` (suivant) :

```
φ   = angle de virage en P (π − angle intérieur), en valeur absolue
L   = min(|PA|, |PB|) / 2                // au maximum, deux arrondis voisins se rejoignent au milieu du côté
P1  = P + t · unit(A − P)                // début de l'arrondi, sur le côté PA
P2  = P + t · unit(B − P)                // fin, sur le côté PB
c1  = P1 + h · unit(P − P1)              // poignées dirigées vers le sommet
c2  = P2 + h · unit(P − P2)

circulaire : t = corner · L
             h = t · (4/3) · tan(φ/4) / tan(φ/2)    // arc de cercle exact en cubique (0,5523·t à 90°)
lissé      : t = min(1.5 · corner · L, L)
             h = 0.82 · t                           // poignées longues : la courbure monte doucement → coin de squircle
```

Chemin : `M P2(dernier sommet)`, puis pour chaque sommet `L P1 C c1 c2 P2`, puis `Z`. Si `t < 0.01`, le sommet reste pointu (`L P`). Un `L` est omis quand la courbe précédente finit déjà au même point, et pour un dernier sommet pointu (le `Z` trace ce côté) : à `corner = 0` un carré s'écrit `M-50 50 L-50 -50 L50 -50 L50 50 Z`. Les sommets rentrants (creux de l'étoile) suivent les mêmes formules. Arrondis à 2 décimales.

À `corner = 1`, un carré circulaire devient un disque et un carré lissé un squircle. L'arrondi ne change pas `radius` (le cadrage reste celui de la forme pointue : un peu de marge en plus, sans importance).

## Géométrie : réplication

`app/utils/replicate.ts`, pur, sans DOM. Repère du logo : `viewBox="-500 -500 1000 1000"`, centre à l'origine.

```ts
interface Copy { x: number, y: number, angle: number, k: number, slot: number } // k = échelle de la forme unité, slot = index dans logo.shapes
interface Replica { copies: Copy[], fit: number, strokeWidth: number }
function replicate(logo: Logo): Replica
```

`m = shapes.length`. Chaque disposition donne la position, l'angle et le `slot` de chaque copie ; `k = s / 100`.

**Rond** (`n = circleCount`) :

```
R       = spread · 350
s       = size · 320
θ_i     = −90° + i · 360° / n              // la copie 0 est en haut
x_i,y_i = R · (cos θ_i, sin θ_i)
angle_i = θ_i + 90° + rotation + i · twist // orientée vers l'extérieur
slot_i  = i mod m
```

`circleCount` est toujours un multiple de `m` (le curseur avance par pas de `m`, voir Panneau) : le motif boucle sans raccord. Avec `spread = 0`, toutes les copies sont au centre : rosace, c'est voulu.

**Grille** (`n = gridSize`, `n²` copies, `i = row · n + col`) :

```
pitch   = spread · 700 / (n − 1)
x, y    = (col − (n−1)/2) · pitch, (row − (n−1)/2) · pitch
s       = size · 800 / n
angle   = rotation + (row + col) · twist
slot    = (row + col) mod m                // diagonales : damier avec 2 formes
```

**Triangle** (`r = triangleRows`, rangée `j` de `0` à `r − 1` contient `j + 1` copies, `c` de `0` à `j` ; `r(r+1)/2` copies, numérotées rangée par rangée) :

```
pitch   = spread · 700 / (r − 1)
h       = pitch · √3 / 2                   // hauteur entre deux rangées
x       = (c − j/2) · pitch
y       = (j − 2(r−1)/3) · h               // centré sur le barycentre, pointe en haut
s       = size · 800 / r
angle   = rotation + j · twist
slot    = (j + c) mod m
```

**Rayons** (`b = rayCount` branches, `q = rayLength` copies par branche, `i = branche · q + p`, `p` de `0` à `q − 1`) :

```
R       = spread · 350
θ       = −90° + branche · 360° / b
ρ_p     = R · (p + 1) / q                  // pas de copie au centre
x, y    = ρ_p · (cos θ, sin θ)
s       = size · 320 / q
angle   = θ + 90° + rotation + p · twist   // orientée le long de la branche
slot    = p mod m                          // toutes les branches identiques
```

4 branches = croix, 5 et plus = étoile.

**Cadrage automatique.** Le logo remplit toujours le cadre, quels que soient les réglages : `écart` et `taille` changent les proportions, pas la taille finale.

```
extent = max_i ( hypot(x_i, y_i) + SHAPES[shapes[slot_i].id].radius · k_i )
fit    = 430 / extent                      // marge de 70 sur un demi-côté de 500
```

Tout le logo est dans un groupe `scale(fit)`, avec `fit = 430 / extent · scale` (`scale` : l’Échelle choisie, 1 par défaut).

**En contour**, `extent` compte aussi le trait : au lieu du rayon de la forme, `outlineRadius(slot, 6, 8)` (`shapes.ts`), le point le plus éloigné du contour une fois tracé. À chaque sommet, la jointure pointue dépasse de `(épaisseur / 2) / sin(angle / 2)`, sauf au-delà de la limite d’onglet (8) où elle est biseautée (`épaisseur / 2`). C’est un majorant (un coin arrondi dépasse moins). Sans cela, les pointes d’une étoile en contour sortaient du cadre.

**Contour.** En mode `stroke` : `fill="none"`, jointures pointues (`miter`, le défaut SVG, avec `stroke-miterlimit="8"` pour que les pointes de l’étoile restent pointues) : l’arrondi des coins ne vient que du réglage Arrondi, qui est dans le chemin. (Avant, `stroke-linejoin="round"` arrondissait les contours même à 0 %.) L'épaisseur est **proportionnelle à la forme** : `stroke-width = 6` dans le repère de la forme unité (6 % de sa boîte de 100), donc `6 · k · fit` à l'écran (`strokeWidth` dans `Replica`). Une petite copie a un trait fin, une grande un trait plus épais. (Avant, le trait faisait 14 unités du logo quelle que soit la taille des copies : sur de petites formes, il remplissait tout l'intérieur et le contour avait l'air plein.) Elle est posée une seule fois sur le groupe de cadrage et hérite jusqu'aux chemins (la valeur s'applique dans le repère de chaque chemin, après son `scale(k)`). Pas de `vector-effect`.

**Aléatoire.** `randomLogo(rand = Math.random): Logo` tire :

- 1 forme (60 %), 2 (30 %) ou 3 (10 %), distinctes, **sans le caractère** (un caractère est un choix délibéré, pas un hasard heureux) ; une forme réglable reçoit un `count` tiré dans ses bornes ;
- une disposition parmi les quatre, et chaque curseur dans sa plage (`circleCount` arrondi au multiple de `m`) ;
- rotation et torsion arrondies à 5°, `twist` nul une fois sur trois ;
- `paint` : `stroke` une fois sur quatre ; `corner` nul une fois sur deux, sinon dans `[0.2, 1]` ; `smooth` une fois sur deux.

Le rendu n'est pas tiré : `randomLogo` renvoie `color: null`, `background: null` et le filtre par défaut, et `shuffle()` (dans `useLogo`) **garde le rendu choisi** — fond et filtre (`filter`, `cells`, `gap`) inchangés, la forme n° *i* reprend la couleur de l'ancienne forme n° *i*. Ce sont les choix de la marque, l'aléatoire explore la géométrie.

## Couleurs

- **Fond** : `background`. `null` = transparent : le plan de travail garde son `bg-elevated` habituel. Sinon le plan de travail prend cette couleur.
- **Formes** : chaque `ShapeSlot.color`. `null` = automatique :
  - sans fond : `currentColor`, donc `text-highlighted` à l'écran (noir en clair, blanc en sombre) et noir dans un fichier ouvert seul ;
  - avec un fond : noir ou blanc, celui qui contraste le plus avec le fond (luminance relative du fond > 0,18 → noir), écrit en dur dans l'aperçu comme dans l'export. Sinon un fond clair en thème sombre donnerait des formes blanches à l'écran et noires à l'export. `inkOf(logo, slot)` dans `replicate.ts` donne cette couleur.
- L'aperçu est le résultat exact : ce qu'on voit sur le plan de travail est ce qui sera exporté (hors coins arrondis du plan de travail).
- En plein, la couleur est le `fill` de la copie ; en contour, son `stroke`.

## Filtre : pixels et hexagones

Le filtre repasse le logo sur une trame : le cadre est découpé en cellules (carrées ou hexagonales), et chaque cellule est **pleine** de la couleur du logo à cet endroit, ou **vide**. Le résultat reste vectoriel : des carrés ou des hexagones nets, exportés en SVG.

`app/utils/mosaic.ts`, pur :

```ts
type Sampler = (x: number, y: number) => number | null  // repère du logo → slot de la forme visible là, ou rien
interface Mosaic { paths: { slot: number, d: string }[] } // un chemin par forme : toutes ses cellules
function mosaic(logo: Logo, sample: Sampler): Mosaic
```

`app/utils/raster.ts` (DOM) : `rasterSampler(logo, replica): Sampler`. Le logo est **dessiné une seule fois** sur un canvas caché, puis lu d'un bloc ; chaque point n'est plus qu'une lecture de tableau. Le coût ne dépend ni du nombre de copies ni de la peinture.

- Canvas `S × S`, `S = min(1024, 8 · cells)` (8 pixels par cellule : assez fin pour 4 points par cellule), contexte `getContext('2d', { willReadFrequently: true })`, réutilisé d'un appel à l'autre.
- Repère : `setTransform(S/1000, 0, 0, S/1000, S/2, S/2)` puis `scale(fit)` ; pour chaque copie, dans l'ordre (la dernière dessinée est au-dessus) : `translate(x, y)`, `rotate(angle)`, `scale(k)`, puis `fill(Path2D)` ou `stroke(Path2D)` (`lineWidth = strokeWidth`, `lineJoin = 'miter'`, `miterLimit = 8`).
- Couleur de dessin = identifiant de la forme : `rgb(slot + 1, 0, 0)`, opaque.
- `getImageData` une fois. Lecture d'un point : pixel `⌊(x + 500) · S / 1000⌋`, `⌊(y + 500) · S / 1000⌋` (borné au canvas) ; alpha < 128 → `null` ; sinon `slot = round(rouge) − 1`, borné à `[0, m − 1]` (les bords anticrénelés entre deux formes tombent sur l'une ou l'autre).

Ancienne approche abandonnée : tester chaque point avec `isPointInPath` / `isPointInStroke` copie par copie. En contour, à 64 cellules et 24 copies, un recalcul prenait ~200 ms (curseur à 5 images/s) ; `isPointInStroke` est lent.

**Trame** (repère du logo, centrée sur l'origine pour que la trame d'un logo symétrique le soit aussi) :

- **Pixels** (`N = cells`) : `c = 1000 / N`, centres `(−500 + c·(i + ½), −500 + c·(j + ½))`, `i, j ∈ [0, N)`. Cellule dessinée : carré de côté `a = c · (1 − gap)` centré, `M x−a/2 y−a/2 h a v a h −a Z`.
- **Hexagones** (pointe en haut) : pas horizontal `w = 1000 / N`, rayon `R = w / √3`, pas vertical `1,5 · R`. Centres `x = (i + (j impair ? ½ : 0)) · w`, `y = j · 1,5 · R`, pour tous les entiers `i, j` tels que la cellule touche le cadre (`|x| ≤ 500 + w`, `|y| ≤ 500 + R`) : une cellule est centrée sur l'origine. Cellule dessinée : hexagone de rayon `R · (1 − gap)`, sommets à `−90° + 60°·k`. Le `viewBox` coupe les cellules du bord, à l'écran comme à l'export.

**Échantillonnage.** Chaque cellule est testée en 4 points, aux décalages `(±q, ±q)` de son centre, `q = c/4` (pixels) ou `w/4` (hexagones). La cellule est pleine si **au moins 1 point sur 4** touche le logo. Les points d'une cellule et de ses voisines forment un réseau de pas `c/2` : une forme large d'au moins `0,71 · c` en touche toujours un, donc rien ne disparaît en basse résolution ni sur un trait fin. (Avec 2 points sur 4, c'est-à-dire environ la moitié de la cellule couverte, une grille 2 × 2 de carrés sur 8 cellules disparaissait entièrement.) Le revers : la forme grossit d'au plus un quart de cellule. Sa forme (`slot`) est celle qui a le plus de points ; à égalité, la plus petite.

En contour, ce sont les traits qui sont tramés ; les cellules, elles, sont toujours pleines.

**Couleur.** Une cellule prend la couleur de sa forme (`inkOf`) ; sans couleur, elle hérite de `currentColor`, comme les copies.

**Coût.** Un dessin du logo (au pire 512 × 512) et une lecture de pixels, puis au pire ~20 000 lectures de tableau. Le calcul se fait côté client uniquement, au plus une fois par frame (voir Mouvement).

## Export

`toSvg(logo): string`, dans `replicate.ts`, construit le fichier depuis `replicate()` :

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-500 -500 1000 1000" width="1000" height="1000">
  <rect x="-500" y="-500" width="1000" height="1000" fill="#…"/>   <!-- seulement si background -->
  <g transform="scale(fit)" fill="currentColor">                    <!-- ou fill="none" stroke="currentColor" stroke-width=… stroke-miterlimit="8" -->
    <path d="…" transform="translate(x y) rotate(angle) scale(k)"/>
    <path d="…" transform="…" fill="#…"/>                            <!-- stroke="#…" en contour, si la forme a une couleur -->
    …
  </g>
</svg>
```

Le chemin de chaque forme est calculé une fois (`shapePath`) et répété. Positions, angles et épaisseur arrondis à 2 décimales ; échelles (`k`, `fit`) à 4.

**Avec un filtre** : `toSvg(logo, tiles?: Mosaic)`. Si `logo.filter !== 'none'` et qu'une mosaïque est fournie, le groupe des copies est remplacé par un chemin par forme (coordonnées arrondies à 2 décimales) :

```xml
  <g fill="currentColor">
    <path d="M… Z M… Z …"/>              <!-- forme sans couleur -->
    <path d="M… Z …" fill="#…"/>         <!-- forme avec couleur (inkOf) -->
  </g>
```

`toSvg` reste pur : c'est l'appelant qui calcule la mosaïque.

`app/utils/download.ts` (chacun calcule la mosaïque avec `rasterSampler()` si un filtre est actif) :

- `downloadSvg(logo)` → `c-logo.svg` (Blob `image/svg+xml`, lien `<a download>` temporaire ; `URL.revokeObjectURL` au tour suivant, `setTimeout(…, 0)`, pour ne pas couper le téléchargement).
- `downloadPng(logo)` → `c-logo.png`, 1024 × 1024 : SVG chargé dans une `Image` via une URL de Blob, dessiné sur un `canvas`, `canvas.toBlob`. Fond transparent sauf si `background`. Les formes sans couleur sont noires.
- `copySvg(logo)` → `navigator.clipboard.writeText(toSvg(logo, …))`.

## Historique : annuler, rétablir

Dans `useLogo`, en mémoire seulement (perdu au rechargement : le logo courant, lui, est toujours sauvegardé).

```ts
past: Logo[]     // au plus 100 états, le plus ancien sort
future: Logo[]   // vidé dès qu'on modifie le logo après avoir annulé
```

- Chaque changement passe par `set(next, { group })`. L'état d'avant est poussé dans `past`, **sauf** s'il s'agit de la suite du même geste : `group` vrai, moins de 500 ms depuis le dernier changement, et le même ensemble de champs modifiés. Ainsi un curseur qu'on fait glisser (des dizaines de `patch` par seconde) ou une couleur choisie en direct dans le sélecteur ne compte que pour **un** pas d'annulation.
- `patch` (et `setColor`, qui passe par lui) regroupe (`group: true`). `toggleShape`, `shuffle` et `load` (charger un design) ne regroupent jamais : chacun est un pas à lui seul, et ils interrompent le regroupement en cours (un `patch` juste après un `shuffle` ouvre son propre pas).
- Un changement qui ne change rien (même logo, champ par champ) n'est pas enregistré.
- `undo()` : l'état courant passe dans `future`, le dernier de `past` devient courant. `redo()` : l'inverse. Les deux écrivent le `localStorage` comme tout changement, et cassent le regroupement en cours (le geste suivant ouvre un nouveau pas).
- `canUndo` / `canRedo` : `computed`.

**Raccourcis** (écoute sur `window`, posée au montage de la page, retirée au démontage) :

| Touches | Action |
|---|---|
| `Ctrl`/`⌘` + `Z` | annuler |
| `Ctrl`/`⌘` + `Maj` + `Z`, `Ctrl` + `Y` | rétablir |
| `Ctrl`/`⌘` + `S` | enregistrer le design (voir Mes designs) ; empêche la sauvegarde de page du navigateur. Galerie fermée, l'icône « Mes designs » devient `i-lucide-check` pendant 1,5 s (`saved` dans `useDesigns`) |

Ignorés si `e.isComposing`, ou si le focus est dans un champ de texte (`input` autre que `type="color"` / `range`, `textarea`, `contenteditable`), pour ne pas voler l'annulation native d'un champ.

## Mes designs

Une galerie de logos enregistrés pour plus tard, 100 % locale.

```ts
interface Design { id: string, logo: Logo, savedAt: number }
```

- `app/composables/useDesigns.ts` : `designs` (le plus récent d'abord), `flash` (id du design dont la vignette clignote, `null` sinon), `save(logo)`, `remove(id)`, `full`, et la constante `MAX_DESIGNS` (100). Clé `localStorage` `c-logo:designs:v1` (tableau JSON), lu au montage côté client. Chaque `logo` est validé par la même fonction que le logo courant (`parseLogo`, sortie de `useLogo` vers `app/utils/parseLogo.ts`) ; une entrée sans `id` texte ou `savedAt` nombre est écartée.
- **Enregistrer** : ajoute le logo courant en tête (`crypto.randomUUID()`, `Date.now()`). Si un design identique existe déjà (`sameLogo(a, b)`, comparaison champ par champ, formes et couleurs comprises), rien n'est ajouté : sa vignette clignote (`@keyframes flash`, 0,6 s) et la galerie la fait défiler dans la vue. Le design identique est par définition le logo courant, donc déjà cerné (voir plus bas) : le clignotement est un second contour qui part du premier vers l'extérieur (`outline-offset` de 0 à 4 px) en s'effaçant ; avec `prefers-reduced-motion`, ce contour reste fixe pendant 0,6 s. Au plus **100** designs : au-delà, le bouton est désactivé, libellé « Galerie pleine ».
- **Charger** : clic sur une vignette → `load(design.logo)` dans `useLogo` (une copie par `copyLogo`, pas `structuredClone` : les objets de l'état contiennent des proxys réactifs, que `structuredClone` refuse), annulable avec `Ctrl+Z`. `save` copie de la même façon.
- **Supprimer** : petit bouton `i-lucide-x` dans le coin de la vignette, visible au survol ou au focus (comme les actions des bulles de memory). Premier clic : il devient `i-lucide-check` « Confirmer la suppression » pendant 3 s ; second clic dans ce délai : supprimé. La suppression ne passe pas par l'historique du logo (elle ne touche pas au logo courant).
- La vignette du design identique au logo courant porte un contour `outline-2 outline-inverted` : on voit où on en est.

**Affichage** : dans le panneau. Un bouton de l'en-tête bascule le corps du panneau entre les réglages (onglets + contenu) et la galerie. L'en-tête et la barre d'export restent en place.

- Vue galerie : en haut, une ligne « Mes designs » (`text-xs text-muted`) + compteur (`12 / 100`, `tabular-nums`), puis un bouton pleine largeur `color="neutral" variant="soft"` `i-lucide-bookmark-plus` « Enregistrer ce design » ; dessous, une grille de vignettes 3 colonnes (`gap-2`), qui défile (`flex-1 overflow-y-auto`).
- Galerie vide : un texte `text-sm text-muted` centré « Aucun design enregistré. » sous le bouton.
- Vignette : un `<button>` natif `aspect-square`, squircle, `border border-default`, fond `bg-elevated` ou `background` du design, qui contient le logo en petit (`LogoArt` statique) ; `aria-label` « Charger le design du <date et heure courtes> » (`toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })` : l'heure distingue deux designs du même jour). Rayon `rounded-2xl` avec `corner-shape: squircle` plutôt que l'utilitaire `squircle`, dont le rayon (2 rem) est trop grand pour une vignette de 79 px. La page possède `useLogo()` et `useDesigns()` (chacun lit le `localStorage` à son montage) et les passe à `LogoControls` ; la galerie ne fait qu'émettre `save`, `load`, `remove`. Le bouton de suppression est un `UButton` `size="xs"` `variant="soft"` en position absolue, en haut à droite.

## Écran

**Desktop (≥ `md`)** : le panneau est fixé à droite (`top-4 right-4 bottom-4`, `w-72`). Le plan de travail est centré dans le reste de l'écran (zone qui s'arrête à `19rem` du bord droit).

**Mobile** : plan de travail en haut, panneau en bas (`inset-x-4 bottom-4`, `max-h-[45dvh]`). Seul le contenu de l'onglet défile, jamais la page. La zone du plan de travail s'arrête à `45dvh + 1rem` du bas.

**Plan de travail** : un carré `border border-default`, squircle (utilitaire `squircle` de `main.css`), fond `bg-elevated` ou `background`. Côté = le plus grand carré qui tient dans la zone avec une marge de 2rem (conteneur `container-type: size`, côté `min(100cqw, 100cqh) − 4rem`). Le SVG le remplit, `text-highlighted`, `role="img"`, `aria-label` « Aperçu du logo ».

### Panneau

`bg-default border border-default rounded-3xl p-4`, colonne, `gap-4`. De haut en bas :

1. **En-tête** (fixe) : pas de titre visible (l'onglet du navigateur dit déjà « c-logo » ; un `h1` `sr-only` le garde pour les lecteurs d'écran). Deux groupes de `UButton` icône seule, `color="neutral" variant="ghost" size="sm"`, aux deux bouts de la ligne :
   - à gauche, l'historique : `i-lucide-undo-2` « Annuler (Ctrl+Z) », `i-lucide-redo-2` « Rétablir (Ctrl+Maj+Z) », désactivés quand il n'y a rien à annuler / rétablir ;
   - à droite, le logo entier : `i-lucide-shuffle` « Aléatoire », `i-lucide-library` « Mes designs », à bascule (`variant="soft"` et `aria-pressed` quand la galerie est ouverte).
   Le libellé « (Ctrl+Z) » etc. utilise `⌘` sur Mac (`userAgent` contient `Mac`), calculé au montage. Pas de bouton « Réinitialiser » : `Ctrl+Z` répare une erreur, et repartir de zéro n'a pas d'usage réel ici.
2. **Onglets** (fixe, masqués quand la galerie est ouverte) : trois `UButton` côte à côte, `size="sm"`, `color="neutral"`, actif `variant="soft"`, sinon `ghost` : « Forme », « Disposition », « Rendu » (largeur selon le texte, `flex-auto`, rien n'est coupé). `role="tablist"` (`aria-label` « Sections ») / `role="tab"` / `aria-selected`, flèches gauche/droite pour passer d'un onglet à l'autre. L'onglet actif est un `ref` local (Forme au départ).
   **Changement d'onglet animé**, pour qu'on lise bien des onglets :
   - le fond de l'onglet actif est **un seul** indicateur (`bg-elevated rounded-md`, en `absolute` derrière les boutons, qui deviennent tous `variant="ghost"` sans fond propre) qui **glisse** d'un onglet à l'autre : `transform: translateX(...)` et `width` mesurés sur l'onglet actif (`getBoundingClientRect()` relatif à la liste d'onglets, car les onglets en `flex-auto` ont des largeurs fractionnaires que `offsetLeft` / `offsetWidth` arrondiraient ; remesurés par un `ResizeObserver` sur la liste et ses onglets, donc au redimensionnement, et à la recréation de la liste au retour de la galerie), `transition: transform 0.25s, width 0.25s` avec la courbe des copies `cubic-bezier(0.22, 1, 0.36, 1)`. Pas d'animation au premier affichage ni au retour de la galerie (la transition n'est activée qu'à l'image suivant la première mesure) ; tant qu'il n'est pas mesuré (rendu serveur), l'onglet actif porte lui-même `bg-elevated` pour qu'il n'y ait pas de saut ;
   - le contenu entrant arrive avec un léger glissement dans le sens de la navigation (vers la droite → il vient de la droite) : `translateX(±12px)` et `opacity 0` → `0` / `1`, 0,2 s, même courbe. Le sens se déduit de la position des onglets (de gauche à droite : vers la droite), donc le passage de « Rendu » à « Forme » par la flèche droite vient de la gauche, comme l'indicateur qui revient en arrière. Le panneau est recréé à chaque onglet (`:key`), ce qui remet aussi le défilement en haut ; le contenu sortant disparaît sans animation (pas de chevauchement), et il n'y a pas de glissement au retour de la galerie ;
   - `prefers-reduced-motion` : indicateur sans transition, contenu sans glissement.
3. **Contenu de l'onglet** (`role="tabpanel"`, `flex-1 overflow-y-auto`) — détaillé ci-dessous — ou **la galerie** (voir Mes designs).
4. **Export** (fixe, en bas) : `UButton` `color="neutral" variant="solid"` `i-lucide-download` « SVG », idem « PNG », et un bouton icône `variant="ghost"` `i-lucide-copy` « Copier le SVG » qui devient `i-lucide-check` pendant 1,5 s.

**Curseurs : des barres**, comme dans les panneaux de réglages des outils de design. Chaque curseur est une barre pleine largeur `h-8 rounded-md bg-elevated` ; la partie « remplie » (`bg-accented`) part de la gauche jusqu'à la valeur ; le libellé (`text-sm text-default`) est posé dans la barre à gauche (`pl-3`), la valeur (`text-sm text-highlighted font-mono tabular-nums`) à droite (`pr-3`). Pas de poignée visible. On clique ou on fait glisser **n'importe où dans la barre** (`cursor-ew-resize`) ; flèches, `Page↑/↓`, `Début/Fin` au clavier.

- C'est toujours un `USlider` (accessibilité et clavier de Reka UI), restylé par sa prop `ui` : la racine et la piste font toute la barre, la plage (`range`) est le remplissage, la poignée (`thumb`) mesure `size-0` (invisible, mais elle garde le focus et le clavier, et il ne reste aucun décalage « in bounds » de Reka UI aux extrémités) ; pas de contour de focus : Reka UI donne le focus à la poignée au clic, donc un contour `:focus-visible` apparaissait aussi à la souris, ce qui faisait bizarre ; retiré à la demande. Libellé et valeur sont superposés en `absolute`, `pointer-events-none`, au-dessus du remplissage.
- Le remplissage va de bord à bord : à la valeur min il est vide, à la valeur max il remplit toute la barre (pas de décalage dû à une poignée). Ses coins suivent ceux de la barre à gauche ; à droite il est droit, sauf à 100 %.
- Les curseurs qui se suivent sont serrés (`gap-1`), en pile, comme une seule liste ; un groupe de curseurs est séparé du reste par l'espacement habituel.
- **Survol** : la barre entière s'éclaircit légèrement (thème sombre) ou s'assombrit (thème clair) — un voile `bg-inverted/5` posé sur toute la barre, `pointer-events-none`, `transition-opacity 150ms`, visible au survol et pendant qu'on fait glisser (`:active`). Le contraste entre remplissage et fond ne change pas.
- Pas de contrôle annexe dans la ligne d'une barre : la barre fait toute la largeur.
- Un curseur signé (Torsion, −180° à 180°) se remplit lui aussi depuis la gauche.

Boutons à bascule : même logique actif/inactif que les onglets, avec `aria-pressed`.

**Onglet Forme**

- **Formes** : grille de 10 `UButton` carrés (5 × 2, ordre `SHAPE_IDS` : cercle, carré, polygone, losange, étoile / pétale, barre, arc, croix, caractère), chacun avec un mini SVG de la forme (`viewBox="-50 -50 100 100"`, `size-5`, `fill="currentColor"`, chemin `shapePath` avec l'arrondi courant ; pour une forme choisie, avec son `count` / `char` à elle, sinon ceux par défaut). Le bouton Caractère montre le texte « Aa » (`text-sm font-semibold`) au lieu d'un SVG tant qu'il n'est pas choisi, puis le contour du caractère choisi, comme les autres boutons. Sélection multiple, jusqu'à 3 :
  - clic sur une forme non choisie : ajoutée à la fin ; s'il y en a déjà 3, la plus ancienne (la première) sort ;
  - clic sur une forme choisie : retirée, sauf si c'est la seule ;
  - dès que 2 formes ou plus sont choisies, chaque forme choisie porte son numéro d'ordre (1, 2, 3) en petit (`text-[10px] text-muted`, coin haut-droit du bouton) : c'est l'ordre de l'alternance.
  - Quand le nombre de formes change, `circleCount` est ramené au multiple de `m` le plus proche, dans `[max(2, m), 24]`.
- **Peinture** : « Plein » (`i-lucide-paint-bucket`) / « Contour » (`i-lucide-pen-line`).
- **Coins** : une ligne de deux boutons à bascule, sous Plein / Contour (`gap-1` entre les deux lignes, comme une pile de barres) et sur le même modèle (`size="sm"`, libellés visibles) : `i-lucide-square-round-corner` « Arrondis » (`smooth: false`) / `i-lucide-squircle` « Squircle » (`smooth: true`). Visible seulement si au moins une forme choisie est à angles (comme la barre Arrondi). Toujours affichée dans ce cas, même à arrondi 0 : la faire apparaître quand on quitte 0 décalerait la barre sous le curseur pendant qu'on la fait glisser.
- **Réglages de forme**, en tête de la pile de barres, un par forme choisie qui en a un, dans l'ordre des formes :
  - étoile, polygone, croix : une barre « Branches » / « Côtés » / « Bras » (`count`, bornes de `SHAPE_COUNT`, pas 1). Si deux formes choisies ont le même libellé (impossible aujourd'hui), on ne s'en soucie pas ;
  - caractère : une ligne de même allure qu'une barre (`h-8 rounded-md bg-elevated`, libellé « Caractère » `text-sm text-default` à gauche), avec à droite un `<input>` d'un caractère (`w-10 text-center font-mono text-sm text-highlighted bg-transparent`, `maxlength` non utilisé : on garde **le dernier caractère tapé**, pour qu'on puisse remplacer sans effacer). Un caractère absent de `GLYPHS` est refusé : la valeur reste l'ancienne et la ligne tremble brièvement (`@keyframes shake`, 0,25 s ; rien sous `prefers-reduced-motion`). `aria-label` « Caractère », et une phrase `sr-only` « Lettres, chiffres et symboles courants. ». Le champ texte garde son propre `Ctrl+Z` (les raccourcis de la page l'ignorent déjà).
  Chaque changement passe par `setShape(slot, changes)` dans `useLogo` (regroupé dans l'historique comme un `patch`).
- **Arrondi** (`corner`, 0–1, pas 0.01, en %) : barre suivante de la pile Arrondi / Taille / Rotation. Visible seulement si au moins une forme choisie est à angles.
- **Taille** (`size`, 0.1–1, pas 0.01, en %).
- **Rotation** (`rotation`, 0–360, pas 1, en °).

**Onglet Disposition**

- **Disposition** : quatre boutons en 2 × 2, libellés visibles : `i-lucide-circle-dashed` « Rond », `i-lucide-grid-3x3` « Grille », `i-lucide-triangle` « Triangle », `i-lucide-asterisk` « Rayons ».
- Curseur(s) de nombre, selon la disposition :
  - Rond : « Copies » (`circleCount`, min `max(2, m)`, max 24, **pas `m`**) ;
  - Grille : « Grille » (`gridSize`, 2–6, affiché « 3 × 3 ») ;
  - Triangle : « Rangées » (`triangleRows`, 2–6) ;
  - Rayons : « Branches » (`rayCount`, 2–12 ; la valeur affiche « 4 · croix » quand elle vaut 4) et « Longueur » (`rayLength`, 1–6).
- **Écart** (`spread`, pas 0.01, en %) : 0–100 % en Rond, **10–100 % en Grille, Triangle et Rayons**. À 0 %, toutes les copies sont au centre : en Rond, c’est une rosace ; ailleurs, des copies identiques empilées, et toutes les dispositions donnent la même image (on croit alors que les boutons de disposition ne marchent plus). La valeur enregistrée n’est pas modifiée : la géométrie et la barre utilisent `spreadOf(logo) = max(spread, minSpread(layout))`, si bien qu’en revenant en Rond, une rosace à 0 % le reste.
- **Torsion** (`twist`, −180–180, pas 1, en °).
- **Échelle** (`scale`, 50–150 %, pas 0.01, défaut 100 %) : agrandit ou rapetisse tout le logo, par-dessus le cadrage automatique. Au-delà de 100 %, le cadre coupe le logo (voulu : motif qui déborde). Gardée par l’aléatoire, comme le rendu.

**Onglet Rendu** (trois sections titrées `text-xs text-muted` : Fond, Formes, Filtre)

- **Fond** : une pastille, et à côté un bouton « Transparent » (`i-lucide-ban`, `size="xs"`, à bascule, actif quand `background` est `null`).
- **Formes** : une ligne par forme choisie : son mini SVG, son label, sa pastille, et un bouton « Auto » (`size="xs"`, à bascule, actif quand `color` est `null`).
- **Pastille** : un `<label>` rond `size-7 rounded-full border border-default`, rempli de la couleur, qui contient un `<input type="color">` visuellement caché (`sr-only`) ; `aria-label` « Couleur du fond » / « Couleur de <label> ». Une couleur `null` est montrée par une pastille vide barrée en diagonale (`text-muted`). Choisir une couleur (événement `input`, en direct) la fixe ; la valeur initiale du sélecteur pour une couleur `null` est `#000000`.

Les boutons « Transparent » / « Auto » remettent `null` ; cliqués quand ils sont déjà actifs, ils ne font rien (on fixe une couleur avec la pastille).

- **Filtre** : trois boutons à bascule, `size="xs"` (en `sm`, icône comprise, ils dépassent des 254 px utiles du panneau), largeur selon le texte (`flex-auto`) : « Aucun » (`i-lucide-circle-off`), « Pixels » (`i-lucide-grid-2x2`), « Hexagones » (`i-lucide-hexagon`). Avec un filtre actif, en dessous :
  - « Résolution » (`cells`, 8–64, pas 1 ; affichée « 24 × 24 » en pixels, « 24 » en hexagones) ;
  - « Espacement » (`gap`, 0–0.5, pas 0.01, en %).

## Mouvement

Chaque copie est un `<g>` dont la position passe par le **style CSS** (pas l'attribut, qui ne s'anime pas) :

```
transform: translate(x px, y px) rotate(angle deg) scale(k)
transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)
```

Le groupe de cadrage (`scale(fit)`) a la même transition, sur `transform` et `stroke-width`. En SVG, les `px` du style sont des unités du `viewBox` et l'origine de transformation par défaut est `0 0` : c'est exactement la géométrie de l'export.

- Les copies sont indexées par leur numéro (`:key="i"`) : en changeant de disposition, la copie *i* **vole** vers sa nouvelle place.
- Une copie qui apparaît entre en fondu : `@keyframes appear { from { opacity: 0 } }`, 0,3 s, déclenché dans le callback `ref` (attribut `data-appear`, retiré à `animationend`), seulement pour les indices nouveaux, une fois `ready`. Pas de `<TransitionGroup>` : sa translation FLIP écraserait le `transform` des copies. Une copie qui disparaît part sans animation.
- Couleurs du fond et des formes : `transition: fill 0.2s, stroke 0.2s, background-color 0.2s`.
- Changer de forme, d'arrondi ou de peinture : remplacement immédiat, pas de morphing.
- **Premier rendu** : les transitions ne sont activées (`data-ready` sur le plan de travail et sur le `<svg>` de `LogoArt`) qu'un `requestAnimationFrame` après la lecture du `localStorage` (état `ready` de `useLogo()`), pour ne pas voir le logo par défaut se transformer en logo sauvegardé.
- `prefers-reduced-motion` : aucune transition, aucun fondu.

**Avec un filtre**, le plan de travail affiche la mosaïque à la place des copies (le groupe des copies n'est pas rendu). La mosaïque est un `shallowRef` recalculé côté client quand le logo change, **au plus une fois par frame** (le changement programme un `requestAnimationFrame`, les changements suivants dans la même frame s'y rattachent). Les cellules n'ont pas de transition de position : elles changent d'une frame à l'autre, ce qui donne un mouvement « pixel art » pendant qu'on fait glisser un curseur. La transition de couleur (`fill 0.2s`) s'applique. Activer ou couper le filtre : remplacement immédiat. Tant que la première mosaïque n'est pas calculée (premier rendu), rien n'est affiché à la place.

## Fichiers

| Fichier | Rôle |
|---|---|
| `app/types/logo.ts` | types `ShapeId`, `Layout`, `Paint`, `Filter`, `ShapeSlot`, `ShapeChanges` (ce que `setShape` peut changer : tout sauf `id`), `Logo`, `Design` |
| `app/utils/shapes.ts` | `SHAPES`, `SHAPE_IDS`, `SHAPE_COUNT`, `DEFAULT_CHAR`, `isAngular`, `newSlot`, `shapeRadius`, `shapePath` (formes réglables, arrondi) — pur |
| `app/utils/glyphs.ts` | `GLYPHS` : contours des caractères — **généré** par `scripts/glyphs.mjs` (`pnpm glyphs`), ne pas éditer |
| `scripts/glyphs.mjs` | lit la police avec `opentype.js` et écrit `app/utils/glyphs.ts` |
| `app/utils/replicate.ts` | `replicate(logo)`, `toSvg(logo)`, `randomLogo(rand)`, `DEFAULT_LOGO`, `LOGO_LIMITS`, `LAYOUTS`, `MAX_SHAPES`, `COLOR_PATTERN`, `minCircleCount(m)`, `snapCircleCount(n, m)`, `roundTo` — pur |
| `app/utils/mosaic.ts` | `mosaic(logo, sample)`, types `Sampler`, `Mosaic` — pur |
| `app/utils/raster.ts` | `rasterSampler(logo, replica)` : dessine le logo sur un canvas caché et lit ses pixels |
| `app/utils/download.ts` | `downloadSvg`, `downloadPng`, `copySvg` (mosaïque comprise) |
| `app/utils/parseLogo.ts` | `parseLogo(data)` (validation champ par champ, sortie de `useLogo`), `changedFields(a, b)` (champs qui diffèrent : sert à regrouper l'historique), `sameLogo(a, b)`, `copyLogo(logo)` — pur |
| `app/composables/useLogo.ts` | état, `ready`, lecture / écriture `localStorage`, historique (`undo`, `redo`, `canUndo`, `canRedo`), `patch(changes)`, `toggleShape(id)`, `setColor(slot, color)`, `setShape(slot, changes)`, `load(logo)`, `shuffle()` (garde les couleurs) |
| `app/composables/useDesigns.ts` | galerie : `designs`, `save(logo)`, `remove(id)`, `full`, `localStorage` |
| `app/components/LogoArt.vue` | le SVG du logo (copies ou mosaïque) ; props `logo`, `animated`, `ready` : animé (plan de travail : transitions, fondu, mosaïque au plus une fois par frame) ou statique (vignettes : mosaïque calculée directement, sans transition) |
| `app/components/LogoCanvas.vue` | plan de travail : cadre, fond, `LogoArt` animé |
| `app/components/LogoGallery.vue` | vue galerie du panneau : enregistrer, vignettes, charger, supprimer |
| `app/components/LogoControls.vue` | panneau : en-tête, onglets, export |
| `app/components/LogoShapeTab.vue` | onglet Forme |
| `app/components/LogoLayoutTab.vue` | onglet Disposition |
| `app/components/LogoRenderTab.vue` | onglet Rendu : couleurs et filtre (remplace `LogoColorTab.vue`) |
| `app/components/LogoSlider.vue` | une ligne libellé + valeur + `USlider` (partagée par les onglets) |
| `app/components/ColorSwatch.vue` | pastille + `<input type="color">` caché |
| `app/pages/index.vue` | assemble le plan de travail et le panneau ; raccourcis clavier |

## Performance

Les mesures se relancent avec les scripts de `scripts/bench/`, sur un build de production (`pnpm build`) :

| Script | Mesure |
|---|---|
| `node scripts/bench/bundle.mjs [out.json]` | taille de `.output/public` (brut, gzip, brotli), par type et pour le premier chargement |
| `node scripts/bench/transfer.mjs http://localhost:3100 [br\|gzip]` | octets réellement transférés par une première visite (cache vide), tels que le serveur les envoie |
| `node scripts/bench/mosaic.mjs <avant.ts> <après.ts>` | temps de `mosaic()` entre deux versions, en alternance ; vérifie d'abord que les sommets sont identiques |
| `node scripts/bench/serve.mjs` puis, dans la page, `await import('http://localhost:3199/browser.mjs')` | dans l'app : chargement (FCP, LCP, requêtes, mémoire), latence d'un cran de curseur, vol des copies au changement de disposition, ouverture de la galerie |

Les mesures image par image (`browser.mjs`) ne valent que si la page est affichée au premier plan : un onglet ou une fenêtre masqués n'ont plus d'images, ou une toutes les secondes. Les pauses de la fenêtre hôte sont comptées à part (`hostStalls`).

**Choix qui comptent :**
- le serveur envoie des copies pré-compressées (`nitro.compressPublicAssets`) : premier chargement **841 Ko → 199 Ko** transférés ;
- les icônes sont dans le bundle (`icon.clientBundle.scan`) : plus de requête à l'API d'icônes au chargement ;
- le CSS ne contient que les composants Nuxt UI utilisés (`ui.experimental.componentDetection`) : **219 Ko → 81 Ko** bruts ;
- un hexagone de la mosaïque s'écrit en relatif depuis son sommet haut, avec un contour calculé une fois : `mosaic()` en hexagones à 64 cellules **13 ms → 2,4 ms** ;
- les vignettes de la galerie (et leur bouton de suppression) ne sont dessinées qu'en approchant de la zone visible : ouverture d'une galerie de 60 designs **~210 ms → ~7 ms** de travail bloquant ;
- l'échantillonneur de la mosaïque dessine le logo décalé d'un demi-pixel et lit le pixel le plus proche : sans cela, les points tombaient sur les bords des pixels et les mosaïques penchaient en haut à gauche (87 → 7 cas asymétriques sur 171 formes simples testées). Essayé et rejeté : 4 pixels par cellule au lieu de 8 (dessin 3× plus rapide, mais des cellules disparaissent sur les traits fins).
