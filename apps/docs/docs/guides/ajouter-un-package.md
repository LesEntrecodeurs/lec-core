---
sidebar_position: 2
---

# Ajouter un nouveau package

Ce guide explique comment créer un nouveau package dans le monorepo et le publier sur npm sous le scope `@lec-packages`.

## Structure cible

A la fin de ce guide, ton package aura cette structure :

```
packages/mon-package/
├── src/
│   └── index.ts          ← Point d'entrée
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Etape 1 : Créer le dossier

```bash
mkdir -p packages/mon-package/src
```

## Etape 2 : Initialiser le `package.json`

Crée le fichier `packages/mon-package/package.json` en adaptant le nom :

```json
{
  "name": "@lec-packages/mon-package",
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
    "@lec-packages/tsup-config": "*",
    "@lec-packages/typescript-config": "*",
    "tsup": "^8.5.1",
    "typescript": "~5.9.3"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

### Points importants

- **`name`** : Doit commencer par `@lec-packages/`
- **`main` / `module` / `types`** : Pointent vers les fichiers buildés dans `dist/`
- **`files`** : Seul le dossier `dist/` est inclus dans le package npm
- **`publishConfig.access`** : Obligatoire pour publier un package scopé en public
- **`version`** : Commence a `0.0.1`, Changesets gère les bumps ensuite

## Etape 3 : Configurer TypeScript

Crée le fichier `packages/mon-package/tsconfig.json` :

```json
{
  "extends": "@lec-packages/typescript-config/base.json",
  "compilerOptions": {
    "lib": ["es2021"],
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

Le monorepo fournit une config TypeScript partagée via `@lec-packages/typescript-config`. Le fichier `base.json` active le mode strict et les options standards.

## Etape 4 : Configurer tsup

Crée le fichier `packages/mon-package/tsup.config.ts` :

```ts
import config from "@lec-packages/tsup-config";

export default config;
```

La config partagée `@lec-packages/tsup-config` génère automatiquement :
- **CJS** (`dist/index.js`) pour `require()`
- **ESM** (`dist/index.mjs`) pour `import`
- **Types** (`dist/index.d.ts`) pour TypeScript

## Etape 5 : Créer le point d'entrée

Crée le fichier `packages/mon-package/src/index.ts` :

```ts
export function hello(): string {
  return "Hello from @lec-packages/mon-package";
}
```

Toutes les exports publiques du package doivent passer par ce fichier `index.ts`.

:::tip Bonne pratique
Organise ton code en sous-dossiers (`domain/`, `application/`, etc.) et réexporte tout depuis `index.ts` :

```ts
export * from "./domain";
export * from "./application";
```
:::

## Etape 6 : Installer les dépendances

Depuis la racine du monorepo :

```bash
yarn install
```

Yarn détecte automatiquement le nouveau workspace grâce à la config `"workspaces": ["packages/*"]` dans le `package.json` racine.

## Etape 7 : Vérifier le build

```bash
yarn build --filter=@lec-packages/mon-package
```

Tu devrais voir le dossier `dist/` apparaitre avec les fichiers générés.

## Etape 8 : Utiliser un package interne comme dépendance

Si ton package dépend d'un autre package du monorepo (par exemple `@lec-packages/ddd-tools`), ajoute-le dans les `dependencies` :

```json
{
  "dependencies": {
    "@lec-packages/ddd-tools": "workspace:*"
  }
}
```

Le protocole `workspace:*` indique a Yarn de résoudre la dépendance localement. Lors de la publication, Changesets remplace `workspace:*` par la version réelle.

## Publier le package

Une fois ton package prêt, la publication suit le workflow Changesets décrit dans le guide [Publication npm](./publication-npm.md).

### Résumé rapide

```bash
# 1. Créer un changeset
yarn changeset
# Sélectionne ton package, choisis "minor" pour la première release, écris un résumé

# 2. Commiter
git add .
git commit -m "feat(mon-package): initial release"
git commit -m "chore: add changeset"

# 3. Push sur main
git push origin main
# La CI publie automatiquement sur npm
```

### Première publication

Pour une première publication, assure-toi que :

1. L'organisation `@lec-packages` existe sur [npmjs.com](https://www.npmjs.com/org/lec-packages)
2. Le secret `NPM_TOKEN` est configuré dans les [secrets GitHub](https://github.com/settings/secrets) du repo
3. Le `package.json` contient bien `"publishConfig": { "access": "public" }`

## Checklist

Avant de merger, vérifie que :

- [ ] Le `name` suit la convention `@lec-packages/nom-du-package`
- [ ] Le `package.json` contient `publishConfig.access: "public"`
- [ ] Le `tsconfig.json` extend `@lec-packages/typescript-config/base.json`
- [ ] Le `tsup.config.ts` utilise `@lec-packages/tsup-config`
- [ ] Le `src/index.ts` exporte tout ce qui est public
- [ ] Le build passe (`yarn build --filter=@lec-packages/nom`)
- [ ] Le lint passe (`yarn lint --filter=@lec-packages/nom`)
- [ ] Un changeset a été créé (`yarn changeset`)