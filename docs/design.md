# c-logo — conception

Créateur de logo : on choisit une à trois formes, elles sont répliquées selon une disposition (rond, grille, triangle ou rayons), on règle quelques curseurs et les couleurs, et on exporte le logo en SVG ou en PNG.

## Principes

- Une seule vue, plein écran (`h-dvh`, `overflow: hidden`), aucun scroll de page.
- **L'interface** est monochrome noir/blanc : couleurs uniquement via les tokens Nuxt UI (`bg-default`, `bg-elevated`, `text-highlighted`, `text-muted`, `border-default`…). Clair et sombre suivent le système. **Le logo**, lui, peut avoir ses propres couleurs (voir Couleurs) ; sans couleur choisie, il est dessiné en `currentColor`.
- Composants Nuxt UI autorisés : `UApp` (racine), `UButton`, `USlider`. Rien d'autre. Les couleurs passent par l'`<input type="color">` natif.
- Données 100 % locales (`localStorage`), rien n'est envoyé.
- La géométrie est une **fonction pure de la configuration** : l'écran et l'export lisent le même résultat, il n'y a pas d'état caché dans le DOM.
- **Ajouter sans surcharger** :
  1. un réglage n'apparaît que s'il a un effet (« Arrondi » seulement avec une forme à angles, « Branches » seulement en rayons…) ;
  2. le panneau est découpé en trois onglets courts (Forme, Disposition, Couleur), l'en-tête et l'export restent toujours visibles ;
  3. une variante d'un réglage existant vaut mieux qu'un nouveau réglage (la croix est une étoile à 4 branches, pas une disposition de plus).

## Modèle

```ts
type ShapeId = 'circle' | 'square' | 'triangle' | 'diamond' | 'petal' | 'bar' | 'arc' | 'star'
type Layout = 'circle' | 'grid' | 'triangle' | 'rays'
type Paint = 'fill' | 'stroke'

interface ShapeSlot {
  id: ShapeId
  color: string | null // '#rrggbb', null = couleur automatique (currentColor)
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
  paint: Paint          // plein ou contour
  corner: number        // 0–1 : arrondi des angles
  smooth: boolean       // coins lissés (squircle) plutôt que circulaires
  background: string | null // '#rrggbb', null = transparent
}
```

Le nombre de copies de chaque disposition est un champ à part : changer de disposition puis revenir retrouve le réglage d'avant. La couleur est portée par la forme (`ShapeSlot`) : elle la suit si l'ordre change.

Défaut : une fleur.

```ts
{
  shapes: [{ id: 'petal', color: null }], layout: 'circle',
  circleCount: 8, gridSize: 3, triangleRows: 3, rayCount: 6, rayLength: 3,
  spread: 0.6, size: 0.5, rotation: 0, twist: 0,
  paint: 'fill', corner: 0, smooth: false, background: null
}
```

Stocké sous la clé `c-logo:logo:v1` (objet JSON). Lecture au montage côté client uniquement (la page est prérendue). Chaque champ est validé (type, bornes, couleurs au format `/^#[0-9a-f]{6}$/i`) ; `circleCount` est ensuite ramené au multiple du nombre de formes ; un champ invalide ou absent prend sa valeur par défaut, champ par champ. `shapes` est valide s'il contient 1 à 3 entrées valides sans doublon, sinon il prend sa valeur par défaut. Écriture à chaque changement.

## Formes

`app/utils/shapes.ts`. Toutes les formes sont dans la boîte unité `[-50, 50]²`, centrées sur l'origine, **pointant vers le haut** (−y). `radius` = rayon du cercle englobant depuis l'origine (sert au cadrage).

Deux familles :

- **À angles** : décrites par leurs sommets (`points`, dans le sens horaire). Le chemin est calculé par `shapePath(id, corner, smooth)`.
- **Courbes** : un chemin fixe (`d`), insensible à l'arrondi.

| id | label | famille | dessin |
|---|---|---|---|
| `circle` | Cercle | courbe | disque de rayon 50 |
| `square` | Carré | angles | carré 100 × 100 (`radius` ≈ 70,7) |
| `triangle` | Triangle | angles | équilatéral, pointe en haut, inscrit dans le cercle de rayon 50 |
| `diamond` | Losange | angles | sommets (0,−50) (32,0) (0,50) (−32,0) |
| `petal` | Pétale | courbe | amande verticale : deux arcs de (0,−50) à (0,50), largeur max 56 |
| `bar` | Barre | angles | rectangle 24 × 100 (`radius` ≈ 51,4) |
| `arc` | Arc | courbe | demi-anneau ouvert vers le bas, rayons 50 et 26, descendu de 25 pour centrer sa boîte (`radius` ≈ 55,9) |
| `star` | Étoile | angles | étoile à 4 branches, rayons 50 et 9,9·√2 |

```ts
interface Shape { label: string, radius: number, points?: [number, number][], d?: string }
const SHAPES: Record<ShapeId, Shape>
const SHAPE_IDS: ShapeId[]                       // ordre d'affichage
function isAngular(id: ShapeId): boolean         // a des `points`
function shapePath(id: ShapeId, corner: number, smooth: boolean): string
```

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

Tout le logo est dans un groupe `scale(fit)`.

**Contour.** En mode `stroke` : `fill="none"`, `stroke-linejoin="round"`. L'épaisseur vaut **14 unités du logo** une fois tout mis à l'échelle, donc `stroke-width = 14 / (k · fit)` (`strokeWidth` dans `Replica`, la même pour toutes les copies d'une disposition). Elle est posée une seule fois sur le groupe de cadrage et hérite jusqu'aux chemins (la valeur s'applique dans le repère de chaque chemin, après son `scale(k)`). Pas de `vector-effect`.

**Aléatoire.** `randomLogo(rand = Math.random): Logo` tire :

- 1 forme (60 %), 2 (30 %) ou 3 (10 %), distinctes ;
- une disposition parmi les quatre, et chaque curseur dans sa plage (`circleCount` arrondi au multiple de `m`) ;
- rotation et torsion arrondies à 5°, `twist` nul une fois sur trois ;
- `paint` : `stroke` une fois sur quatre ; `corner` nul une fois sur deux, sinon dans `[0.2, 1]` ; `smooth` une fois sur deux.

Les couleurs ne sont pas tirées : `randomLogo` renvoie `color: null` et `background: null`, et `shuffle()` (dans `useLogo`) **garde les couleurs choisies** — fond inchangé, la forme n° *i* reprend la couleur de l'ancienne forme n° *i*. Ce sont les couleurs de la marque, l'aléatoire explore la géométrie.

## Couleurs

- **Fond** : `background`. `null` = transparent : le plan de travail garde son `bg-elevated` habituel. Sinon le plan de travail prend cette couleur.
- **Formes** : chaque `ShapeSlot.color`. `null` = automatique :
  - sans fond : `currentColor`, donc `text-highlighted` à l'écran (noir en clair, blanc en sombre) et noir dans un fichier ouvert seul ;
  - avec un fond : noir ou blanc, celui qui contraste le plus avec le fond (luminance relative du fond > 0,18 → noir), écrit en dur dans l'aperçu comme dans l'export. Sinon un fond clair en thème sombre donnerait des formes blanches à l'écran et noires à l'export. `inkOf(logo, slot)` dans `replicate.ts` donne cette couleur.
- L'aperçu est le résultat exact : ce qu'on voit sur le plan de travail est ce qui sera exporté (hors coins arrondis du plan de travail).
- En plein, la couleur est le `fill` de la copie ; en contour, son `stroke`.

## Export

`toSvg(logo): string`, dans `replicate.ts`, construit le fichier depuis `replicate()` :

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-500 -500 1000 1000" width="1000" height="1000">
  <rect x="-500" y="-500" width="1000" height="1000" fill="#…"/>   <!-- seulement si background -->
  <g transform="scale(fit)" fill="currentColor">                    <!-- ou fill="none" stroke="currentColor" stroke-width=… stroke-linejoin="round" -->
    <path d="…" transform="translate(x y) rotate(angle) scale(k)"/>
    <path d="…" transform="…" fill="#…"/>                            <!-- stroke="#…" en contour, si la forme a une couleur -->
    …
  </g>
</svg>
```

Le chemin de chaque forme est calculé une fois (`shapePath`) et répété. Positions, angles et épaisseur arrondis à 2 décimales ; échelles (`k`, `fit`) à 4.

`app/utils/download.ts` :

- `downloadSvg(logo)` → `c-logo.svg` (Blob `image/svg+xml`, lien `<a download>` temporaire ; `URL.revokeObjectURL` au tour suivant, `setTimeout(…, 0)`, pour ne pas couper le téléchargement).
- `downloadPng(logo)` → `c-logo.png`, 1024 × 1024 : SVG chargé dans une `Image` via une URL de Blob, dessiné sur un `canvas`, `canvas.toBlob`. Fond transparent sauf si `background`. Les formes sans couleur sont noires.
- `copySvg(logo)` → `navigator.clipboard.writeText(toSvg(logo))`.

## Écran

**Desktop (≥ `md`)** : le panneau est fixé à droite (`top-4 right-4 bottom-4`, `w-72`). Le plan de travail est centré dans le reste de l'écran (zone qui s'arrête à `19rem` du bord droit).

**Mobile** : plan de travail en haut, panneau en bas (`inset-x-4 bottom-4`, `max-h-[45dvh]`). Seul le contenu de l'onglet défile, jamais la page. La zone du plan de travail s'arrête à `45dvh + 1rem` du bas.

**Plan de travail** : un carré `border border-default`, squircle (utilitaire `squircle` de `main.css`), fond `bg-elevated` ou `background`. Côté = le plus grand carré qui tient dans la zone avec une marge de 2rem (conteneur `container-type: size`, côté `min(100cqw, 100cqh) − 4rem`). Le SVG le remplit, `text-highlighted`, `role="img"`, `aria-label` « Aperçu du logo ».

### Panneau

`bg-default border border-default rounded-3xl p-4`, colonne, `gap-4`. De haut en bas :

1. **En-tête** (fixe) : « c-logo » (`h1`, `text-sm font-medium text-highlighted`) ; à droite deux `UButton` icône seule, `color="neutral" variant="ghost" size="sm"` : `i-lucide-shuffle` « Aléatoire », `i-lucide-rotate-ccw` « Réinitialiser ».
2. **Onglets** (fixe) : trois `UButton` côte à côte, `size="sm"`, `color="neutral"`, actif `variant="soft"`, sinon `ghost` : « Forme », « Disposition », « Couleur ». `role="tablist"` (`aria-label` « Sections ») / `role="tab"` / `aria-selected`, flèches gauche/droite pour passer d'un onglet à l'autre. L'onglet actif est un `ref` local (Forme au départ).
3. **Contenu de l'onglet** (`role="tabpanel"`, `flex-1 overflow-y-auto`) — détaillé ci-dessous.
4. **Export** (fixe, en bas) : `UButton` `color="neutral" variant="solid"` `i-lucide-download` « SVG », idem « PNG », et un bouton icône `variant="ghost"` `i-lucide-copy` « Copier le SVG » qui devient `i-lucide-check` pendant 1,5 s.

Curseurs : `USlider`, `color="neutral"`, `size="sm"`, avec une ligne au-dessus : libellé `text-xs text-muted` à gauche, valeur `text-xs text-highlighted tabular-nums` à droite. Boutons à bascule : même logique actif/inactif que les onglets, avec `aria-pressed`.

**Onglet Forme**

- **Formes** : grille de 8 `UButton` carrés (4 × 2), chacun avec un mini SVG de la forme (`viewBox="-50 -50 100 100"`, `size-5`, `fill="currentColor"`, chemin `shapePath` avec l'arrondi courant). Sélection multiple, jusqu'à 3 :
  - clic sur une forme non choisie : ajoutée à la fin ; s'il y en a déjà 3, la plus ancienne (la première) sort ;
  - clic sur une forme choisie : retirée, sauf si c'est la seule ;
  - dès que 2 formes ou plus sont choisies, chaque forme choisie porte son numéro d'ordre (1, 2, 3) en petit (`text-[10px] text-muted`, coin haut-droit du bouton) : c'est l'ordre de l'alternance.
  - Quand le nombre de formes change, `circleCount` est ramené au multiple de `m` le plus proche, dans `[max(2, m), 24]`.
- **Peinture** : « Plein » (`i-lucide-paint-bucket`) / « Contour » (`i-lucide-pen-line`).
- **Arrondi** (`corner`, 0–1, pas 0.01, en %) et, sur la même ligne que sa valeur, un petit bouton à bascule « Lissé » (`size="xs"`). Visibles seulement si au moins une forme choisie est à angles.
- **Taille** (`size`, 0.1–1, pas 0.01, en %).
- **Rotation** (`rotation`, 0–360, pas 1, en °).

**Onglet Disposition**

- **Disposition** : quatre boutons en 2 × 2, libellés visibles : `i-lucide-circle-dashed` « Rond », `i-lucide-grid-3x3` « Grille », `i-lucide-triangle` « Triangle », `i-lucide-asterisk` « Rayons ».
- Curseur(s) de nombre, selon la disposition :
  - Rond : « Copies » (`circleCount`, min `max(2, m)`, max 24, **pas `m`**) ;
  - Grille : « Grille » (`gridSize`, 2–6, affiché « 3 × 3 ») ;
  - Triangle : « Rangées » (`triangleRows`, 2–6) ;
  - Rayons : « Branches » (`rayCount`, 2–12 ; la valeur affiche « 4 · croix » quand elle vaut 4) et « Longueur » (`rayLength`, 1–6).
- **Écart** (`spread`, 0–1, pas 0.01, en %).
- **Torsion** (`twist`, −180–180, pas 1, en °).

**Onglet Couleur**

- **Fond** : une pastille, et à côté un bouton « Transparent » (`i-lucide-ban`, `size="xs"`, à bascule, actif quand `background` est `null`).
- **Formes** : une ligne par forme choisie : son mini SVG, son label, sa pastille, et un bouton « Auto » (`size="xs"`, à bascule, actif quand `color` est `null`).
- **Pastille** : un `<label>` rond `size-7 rounded-full border border-default`, rempli de la couleur, qui contient un `<input type="color">` visuellement caché (`sr-only`) ; `aria-label` « Couleur du fond » / « Couleur de <label> ». Une couleur `null` est montrée par une pastille vide barrée en diagonale (`text-muted`). Choisir une couleur (événement `input`, en direct) la fixe ; la valeur initiale du sélecteur pour une couleur `null` est `#000000`.

Les boutons « Transparent » / « Auto » remettent `null` ; cliqués quand ils sont déjà actifs, ils ne font rien (on fixe une couleur avec la pastille).

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
- **Premier rendu** : les transitions ne sont activées (`data-ready` sur le plan de travail) qu'un `requestAnimationFrame` après la lecture du `localStorage` (état `ready` de `useLogo()`), pour ne pas voir le logo par défaut se transformer en logo sauvegardé.
- `prefers-reduced-motion` : aucune transition, aucun fondu.

## Fichiers

| Fichier | Rôle |
|---|---|
| `app/types/logo.ts` | types `ShapeId`, `Layout`, `Paint`, `ShapeSlot`, `Logo` |
| `app/utils/shapes.ts` | `SHAPES`, `SHAPE_IDS`, `isAngular`, `shapePath` (arrondi) — pur |
| `app/utils/replicate.ts` | `replicate(logo)`, `toSvg(logo)`, `randomLogo(rand)`, `DEFAULT_LOGO`, `LOGO_LIMITS`, `LAYOUTS`, `MAX_SHAPES`, `COLOR_PATTERN`, `minCircleCount(m)`, `snapCircleCount(n, m)`, `roundTo` — pur |
| `app/utils/download.ts` | `downloadSvg`, `downloadPng`, `copySvg` |
| `app/composables/useLogo.ts` | état, `ready`, lecture / validation / écriture `localStorage`, `patch(changes)`, `toggleShape(id)`, `setColor(slot, color)`, `reset()`, `shuffle()` (garde les couleurs) |
| `app/components/LogoCanvas.vue` | plan de travail, SVG animé à partir de `replicate()` |
| `app/components/LogoControls.vue` | panneau : en-tête, onglets, export |
| `app/components/LogoShapeTab.vue` | onglet Forme |
| `app/components/LogoLayoutTab.vue` | onglet Disposition |
| `app/components/LogoColorTab.vue` | onglet Couleur |
| `app/components/LogoSlider.vue` | une ligne libellé + valeur + `USlider` (partagée par les onglets) |
| `app/components/ColorSwatch.vue` | pastille + `<input type="color">` caché |
| `app/pages/index.vue` | assemble le plan de travail et le panneau |
