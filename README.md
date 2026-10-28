# c-logo

Un créateur de logo : on choisit une à trois formes, elles sont répliquées en rond, en grille, en triangle ou en rayons, on règle quelques curseurs et les couleurs, on peut passer le tout au filtre pixels ou hexagones, et on exporte le résultat en SVG ou en PNG.

Les données restent dans le `localStorage` de votre navigateur, rien n'est envoyé.

## Démarrage

```bash
pnpm install
pnpm dev
```

Conception détaillée dans [`docs/design.md`](docs/design.md).

## Caractères

La forme « Caractère » utilise les contours d'[Inter](https://rsms.me/inter/) Bold (© The Inter Project Authors), sous licence SIL Open Font License 1.1. `app/utils/glyphs.ts` en est généré par `pnpm glyphs` (police fournie par `@fontsource/inter`, lue avec `opentype.js`, deux dépendances de développement) ; seuls les contours des caractères ASCII sont embarqués.
