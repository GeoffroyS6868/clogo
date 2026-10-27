# Clogo — conception

Créateur de logo : on choisit une forme, elle est répliquée **en rond** (copies autour d'un centre) ou **en carré** (grille), on règle quelques curseurs, et on exporte le logo en SVG ou en PNG.

## Principes

- Une seule vue, plein écran (`h-dvh`, `overflow: hidden`), aucun scroll de page.
- Monochrome noir/blanc. Couleurs uniquement via les tokens Nuxt UI (`bg-default`, `bg-elevated`, `text-highlighted`, `text-muted`, `border-default`…). Clair et sombre suivent le système. Le logo est dessiné en `currentColor`.
- Composants Nuxt UI autorisés : `UApp` (racine), `UButton`, `USlider`. Rien d'autre.
- Données 100 % locales (`localStorage`), rien n'est envoyé.
- La géométrie est une **fonction pure de la configuration** : l'écran et l'export lisent le même résultat, il n'y a pas d'état caché dans le DOM.

## Modèle

```ts
type ShapeId = 'circle' | 'square' | 'triangle' | 'diamond' | 'petal' | 'bar' | 'arc' | 'star'
type Layout = 'circle' | 'square'
type Paint = 'fill' | 'stroke'

interface Logo {
  shape: ShapeId
  layout: Layout
  circleCount: number // rond : nombre de copies, 2–24
  gridSize: number    // carré : copies par côté, 2–6
  spread: number      // 0–1 : rayon (rond) ou écartement (carré)
  size: number        // 0.1–1 : taille de chaque forme
  rotation: number    // 0–360° : rotation de base de chaque forme
  twist: number       // −180–180° : rotation ajoutée de copie en copie
  paint: Paint        // plein ou contour
}
```

`circleCount` et `gridSize` sont séparés : passer de rond à carré puis revenir retrouve le réglage d'avant.

Défaut : `{ shape: 'petal', layout: 'circle', circleCount: 8, gridSize: 3, spread: 0.6, size: 0.5, rotation: 0, twist: 0, paint: 'fill' }` — une fleur.

Stocké sous la clé `clogo:logo:v1` (objet JSON). Lecture au montage côté client uniquement (la page est prérendue). Chaque champ est validé (type et bornes) ; un champ invalide ou absent prend sa valeur par défaut, champ par champ. Écriture à chaque changement.

## Formes

`app/utils/shapes.ts` : `SHAPES: Record<ShapeId, { label: string, d: string, radius: number }>`.

- `d` : un chemin SVG dans la boîte unité `[-50, 50]²`, centré sur l'origine, **pointant vers le haut** (−y). Tout en `M/L/A/C/Z`, chemins fermés.
- `radius` : rayon du cercle englobant depuis l'origine (sert au cadrage).

| id | label | dessin |
|---|---|---|
| `circle` | Cercle | disque de rayon 50 |
| `square` | Carré | carré 100 × 100 (`radius` = √(50² + 50²) ≈ 70,7) |
| `triangle` | Triangle | équilatéral, pointe en haut, inscrit dans le cercle de rayon 50 |
| `diamond` | Losange | sommets (0,−50) (32,0) (0,50) (−32,0) |
| `petal` | Pétale | amande verticale : deux arcs de (0,−50) à (0,50), largeur max ~56 |
| `bar` | Barre | rectangle 24 × 100 (`radius` = √(12² + 50²) ≈ 51,4) |
| `arc` | Arc | demi-anneau ouvert vers le bas : rayons 50 et 26, moitié haute, descendu de 25 pour que sa boîte soit centrée sur l'origine (`radius` = √(50² + 25²) ≈ 55,9) |
| `star` | Étoile | étoile à 4 branches (scintillement), rayons 50 et 14 |

## Géométrie : réplication

`app/utils/replicate.ts`, pur, sans DOM. Il exporte aussi `roundTo(v, digits = 2)`. Repère du logo : `viewBox="-500 -500 1000 1000"`, centre à l'origine.

```ts
interface Copy { x: number, y: number, angle: number, k: number } // k = échelle de la forme unité
interface Replica { copies: Copy[], fit: number, strokeWidth: number }
function replicate(logo: Logo): Replica
```

**Rond** (`n = circleCount`) :

```
R       = spread · 350
s       = size · 320                       // taille de la forme, en unités du logo
θ_i     = −90° + i · 360° / n              // la copie 0 est en haut
x_i,y_i = R · (cos θ_i, sin θ_i)
angle_i = θ_i + 90° + rotation + i · twist // orientée vers l'extérieur
k       = s / 100
```

Avec `spread = 0`, toutes les copies sont au centre et tournées de `360/n` chacune : on obtient une rosace. C'est voulu.

**Carré** (`n = gridSize`, `n²` copies, index `i = row · n + col`) :

```
span    = spread · 700                     // distance entre la première et la dernière colonne
pitch   = span / (n − 1)
x, y    = (col − (n−1)/2) · pitch, (row − (n−1)/2) · pitch
s       = size · 800 / n
angle   = rotation + (row + col) · twist   // torsion en diagonale : le motif reste symétrique
k       = s / 100
```

**Cadrage automatique.** Le logo remplit toujours le cadre, quels que soient les réglages : `écart` et `taille` changent les proportions, pas la taille finale.

```
extent = max_i ( hypot(x_i, y_i) + SHAPES[shape].radius · k )
fit    = 430 / extent                      // marge de 70 sur un demi-côté de 500
```

Tout le logo est dans un groupe `scale(fit)`.

**Contour.** En mode `stroke` : `fill="none"`, `stroke="currentColor"`, `stroke-linejoin="round"`. L'épaisseur doit valoir **14 unités du logo** une fois tout mis à l'échelle, donc `stroke-width = 14 / (k · fit)` (exposé comme `strokeWidth` dans `Replica`, la même pour toutes les copies). Elle est posée une seule fois sur le groupe de cadrage et hérite jusqu'aux chemins : la valeur s'applique dans le repère de chaque chemin, donc après son `scale(k)`. Pas de `vector-effect` : l'export doit rester lisible par n'importe quel éditeur.

**Aléatoire.** `randomLogo(rand = Math.random): Logo` tire une forme, une disposition, et chaque curseur dans sa plage (rotation et torsion arrondies à 5°, `twist` nul une fois sur trois pour garder des logos sages). `paint` : `stroke` une fois sur quatre.

## Export

`toSvg(logo): string`, dans `replicate.ts`, construit le fichier depuis `replicate()` :

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-500 -500 1000 1000" width="1000" height="1000">
  <g transform="scale(fit)" fill="currentColor">          <!-- ou fill="none" stroke=… en contour -->
    <path d="…" transform="translate(x y) rotate(angle) scale(k)" />
    …
  </g>
</svg>
```

Positions, angles et épaisseur de trait arrondis à 2 décimales ; les échelles (`k`, `fit`) à 4, car 2 décimales fausseraient jusqu'à 4 % les petites formes d'une grille 6 × 6. En contour, `stroke-width` et `stroke-linejoin` sont sur le `<g>` (voir plus haut). `currentColor` : noir quand le fichier est ouvert seul, recolorable quand il est intégré dans une page.

`app/utils/download.ts` (DOM, petit) :

- `downloadSvg(logo)` → `clogo.svg` (Blob `image/svg+xml`, lien `<a download>` temporaire, `URL.revokeObjectURL` ensuite).
- `downloadPng(logo)` → `clogo.png`, 1024 × 1024, fond transparent, logo noir : on charge le SVG dans une `Image` via une URL de Blob, on le dessine sur un `canvas`, `canvas.toBlob`.
- `copySvg(logo)` → `navigator.clipboard.writeText(toSvg(logo))`.

## Écran

**Desktop (≥ `md`)** : le panneau de réglages est fixé à droite (`top-4 right-4 bottom-4`, `w-72`). Le plan de travail est centré dans le reste de l'écran (une zone qui s'arrête à `19rem` du bord droit).

**Mobile** : le plan de travail en haut, le panneau en bas (`inset-x-4 bottom-4`, `max-h-[45dvh]`). Seul le contenu du panneau défile, jamais la page. La zone du plan de travail s'arrête à `45dvh + 1rem` du bas, pour ne jamais passer sous le panneau.

**Plan de travail** : un carré `bg-elevated border border-default`, squircle comme les bulles de memory (reprendre l'utilitaire `squircle` de memory dans `main.css`), côté = le plus grand carré qui tient dans la zone libre avec une marge de 2rem (zone = conteneur `container-type: size`, côté = `min(100cqw, 100cqh) − 4rem`). Le SVG le remplit, `text-highlighted` (`role="img"`, `aria-label` « Aperçu du logo »).

**Panneau** : `bg-default border border-default rounded-3xl p-4`, colonne, `gap-5`.

1. **En-tête** : « Clogo » (`h1`, `text-sm font-medium text-highlighted`) à gauche ; à droite deux `UButton` icône seule, `color="neutral" variant="ghost" size="sm"` : `i-lucide-shuffle` « Aléatoire », `i-lucide-rotate-ccw` « Réinitialiser ».
2. **Forme** : grille de 8 `UButton` carrés (4 × 2), chacun contient un mini SVG de la forme (`viewBox="-50 -50 100 100"`, `size-5`, `fill="currentColor"`), `aria-label` = label. Active : `variant="soft"`, sinon `variant="ghost"`, toujours `color="neutral"`. `aria-pressed` sur l'active.
3. **Disposition** : deux boutons côte à côte, même logique actif/inactif : `i-lucide-circle-dashed` « Rond », `i-lucide-grid-3x3` « Carré ». En dessous, la peinture, même logique : `i-lucide-paint-bucket` « Plein » et `i-lucide-pen-line` « Contour ». Libellés visibles, `size="sm"`.
4. **Curseurs** (`USlider`, `color="neutral"`, `size="sm"`), chacun avec une ligne au-dessus : libellé `text-xs text-muted` à gauche, valeur `text-xs text-highlighted tabular-nums` à droite.
   - « Copies » (rond, `circleCount`, 2–24, pas 1) ou « Grille » (carré, `gridSize`, 2–6, pas 1, valeur affichée « 3 × 3 »). Un seul des deux est visible selon la disposition.
   - « Écart » (`spread`, 0–1, pas 0.01, affiché en %).
   - « Taille » (`size`, 0.1–1, pas 0.01, en %).
   - « Rotation » (`rotation`, 0–360, pas 1, en °).
   - « Torsion » (`twist`, −180–180, pas 1, en °).
5. **Export** (en bas, poussé par `md:mt-auto`) : `UButton` `color="neutral" variant="solid"` `i-lucide-download` « SVG », idem « PNG », et un bouton icône `variant="ghost"` `i-lucide-copy` « Copier le SVG » qui devient `i-lucide-check` pendant 1,5 s après la copie.

## Mouvement

Chaque copie est un `<g>` dont la position passe par le **style CSS** (pas l'attribut, qui ne s'anime pas) :

```
transform: translate(x px, y px) rotate(angle deg) scale(k)
transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)
```

Le groupe de cadrage (`scale(fit)`) a la même transition, sur `transform` et sur `stroke-width` (le trait reste ainsi proche de 14 unités pendant le vol). En SVG, les `px` du style sont des unités du `viewBox` et l'origine de transformation par défaut est `0 0` : c'est exactement la géométrie de l'export.

- Les copies sont indexées par leur numéro (`:key="i"`) : quand on passe de rond à carré, la copie *i* du cercle **vole** vers la case *i* de la grille. Changer l'écart, la taille ou la torsion déplace tout en douceur.
- Une copie qui apparaît (on augmente le nombre) entre en fondu : `@keyframes appear { from { opacity: 0 } }`, 0,3 s. Une copie qui disparaît part sans animation. Le fondu est déclenché dans le callback `ref` de la copie (attribut `data-appear`, retiré à `animationend`) : le composant garde l'ensemble des indices déjà affichés et n'anime que les nouveaux, une fois `ready`. Pas de `<TransitionGroup>` : sa translation de déplacement (FLIP) écraserait le `transform` des copies.
- Changer de forme ou de peinture : remplacement immédiat, pas de morphing.
- **Premier rendu** : la page est prérendue avec le logo par défaut, puis la configuration sauvegardée est lue au montage. Pour ne pas voir le logo par défaut se transformer en logo sauvegardé, les transitions ne sont activées (`data-ready` sur le SVG) qu'après le premier `requestAnimationFrame` suivant la lecture. L'état `ready` (`useState`) vient de `useLogo()`, qui le passe à vrai dans ce `requestAnimationFrame`.
- `prefers-reduced-motion` : aucune transition, aucun fondu.

## Fichiers

| Fichier | Rôle |
|---|---|
| `app/types/logo.ts` | types `ShapeId`, `Layout`, `Paint`, `Logo` |
| `app/utils/shapes.ts` | `SHAPES` : chemin, label et rayon de chaque forme ; `SHAPE_IDS` : leurs identifiants, dans l'ordre d'affichage |
| `app/utils/replicate.ts` | `replicate(logo)`, `toSvg(logo)`, `randomLogo(rand)`, `DEFAULT_LOGO`, `LOGO_LIMITS` (bornes et pas des curseurs), `roundTo` — pur, sans DOM |
| `app/utils/download.ts` | `downloadSvg`, `downloadPng`, `copySvg` |
| `app/composables/useLogo.ts` | état, `ready`, lecture / validation / écriture `localStorage`, `patch(changes)`, `reset()`, `shuffle()` (l'écriture a lieu dans ces trois actions) |
| `app/components/LogoCanvas.vue` | plan de travail, SVG animé à partir de `replicate()` |
| `app/components/LogoControls.vue` | panneau : forme, disposition, peinture, curseurs, export |
| `app/pages/index.vue` | assemble les deux |
