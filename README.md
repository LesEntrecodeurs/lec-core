# LEC Internal Packages

Monorepo des packages internes **Les Entrecodeurs**, publiés sous le scope `@lec-core` sur npm.

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| `@lec-core/ddd-tools` | Primitives DDD : Entity, ValueObject, Result, Command, Repository | [![npm](https://img.shields.io/npm/v/@lec-core/ddd-tools)](https://www.npmjs.com/package/@lec-core/ddd-tools) |
| `@lec-core/alert` | Alertes multi-providers (Discord, Email) avec detection de pannes | [![npm](https://img.shields.io/npm/v/@lec-core/alert)](https://www.npmjs.com/package/@lec-core/alert) |

## Prérequis

- Node.js >= 18
- Yarn 4 (`corepack enable`)

## Installation

```bash
yarn install
```

## Commandes

```bash
yarn build              # Build tous les packages et apps
yarn dev                # Mode dev (watch)
yarn lint               # Lint tous les packages
yarn build:packages     # Build uniquement les packages (sans les apps)
yarn format-and-lint    # Vérification Biome (lint + format)
yarn format-and-lint:fix # Auto-fix Biome
```

## Ajouter un nouveau package

### 1. Créer le dossier du package

```bash
mkdir -p packages/mon-package/src
```

### 2. Initialiser le `package.json`

Créer `packages/mon-package/package.json` :

```json
{
  "name": "@lec-core/mon-package",
  "version": "0.0.1",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "license": "MIT",
  "files": ["dist/**"],
  "scripts": {
    "build": "tsup",
    "clean": "rm -rf dist",
    "dev": "tsup --watch"
  },
  "devDependencies": {
    "@lec-core/tsup-config": "*",
    "@lec-core/typescript-config": "*",
    "tsup": "^8.5.1",
    "typescript": "~5.9.3"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

### 3. Configurer TypeScript

Créer `packages/mon-package/tsconfig.json` :

```json
{
  "extends": "@lec-core/typescript-config/base.json",
  "compilerOptions": {
    "lib": ["es2021"],
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

### 4. Configurer tsup

Créer `packages/mon-package/tsup.config.ts` :

```ts
import config from "@lec-core/tsup-config";

export default config;
```

### 5. Créer le point d'entrée

Créer `packages/mon-package/src/index.ts` :

```ts
export function hello(): string {
  return "Hello from @lec-core/mon-package";
}
```

### 6. Installer les dépendances

```bash
yarn install
```

### 7. Vérifier le build

```bash
yarn build --filter=@lec-core/mon-package
```

## Publier sur npm

La publication est **automatisée** via Changesets + GitHub Actions.

### 1. Créer un changeset

Après avoir fait tes modifications, lance :

```bash
yarn changeset
```

L'outil interactif te demande :
1. Quel(s) package(s) sont impactés
2. Le type de bump (`patch`, `minor`, `major`)
3. Un résumé du changement

### 2. Commiter le changeset

```bash
git add .changeset/
git commit -m "chore: add changeset"
```

### 3. Push sur main

```bash
git push origin main
```

La CI se charge automatiquement de :
- Builder et linter les packages
- Appliquer les versions (bump + CHANGELOG)
- Publier sur npm
- Pousser les tags git

### Publication manuelle (si besoin)

```bash
yarn release
```

## Documentation

La documentation est disponible sur [lec-internal-docs.vercel.app](https://lec-internal-docs.vercel.app).

Pour lancer la doc en local :

```bash
yarn dev --filter=docs
```

## Stack technique

- **TypeScript** 5.9 (strict)
- **tsup** (CJS + ESM + `.d.ts`)
- **Turborepo** (orchestration monorepo)
- **Changesets** (versioning + publication npm)
- **Biome** (lint + format)
- **Yarn 4** (package manager)
- **Docusaurus** (documentation)