---
sidebar_position: 1
---

# Publication npm avec Changesets

Ce guide explique comment les packages `@lec/*` sont automatiquement publiés sur npm via [Changesets](https://github.com/changesets/changesets) et GitHub Actions.

## Vue d'ensemble

```
code + yarn changeset → push main → PR auto créée → merge PR → publié sur npm
```

Changesets gère le **versioning sémantique** (semver) et la **publication** des packages du monorepo. Chaque changement qui impacte un package publié doit être accompagné d'un fichier changeset décrivant le type de modification.

## Packages publiés

| Package | npm | Accès |
|---------|-----|-------|
| `@lec/ddd-tools` | [@lec/ddd-tools](https://www.npmjs.com/package/@lec/ddd-tools) | Public |
| `@lec/alert` | [@lec/alert](https://www.npmjs.com/package/@lec/alert) | Public |

## Workflow de développement

### 1. Développer et commiter

Travaille normalement sur ta branche avec des commits conventionnels :

```bash
git commit -m "feat(alert): add Slack provider"
git commit -m "fix(ddd-tools): fix Result.unwrap type"
```

### 2. Créer un changeset

Quand un changement impacte un package publié, lance la commande :

```bash
yarn changeset
```

L'outil interactif te pose trois questions :

1. **Quel(s) package(s) sont impactés ?** — Sélectionne avec `Espace`, valide avec `Entrée`
2. **Quel type de bump ?** — `patch` (fix), `minor` (feature), `major` (breaking change)
3. **Résumé du changement** — Une ligne décrivant ce qui a changé (apparaîtra dans le CHANGELOG)

Cela crée un fichier Markdown dans `.changeset/` :

```
.changeset/
└── funny-dogs-dance.md   ← nom auto-généré
```

```markdown
---
"@lec/alert": minor
---

Ajout du provider Slack pour les alertes
```

### 3. Commiter le changeset

```bash
git add .changeset/funny-dogs-dance.md
git commit -m "chore: add changeset for Slack provider"
```

### 4. Push / merge sur main

Pousse ta branche et merge sur `main` comme d'habitude.

## Ce qui se passe en CI

Le workflow GitHub Actions (`.github/workflows/release.yml`) se déclenche à chaque push sur `main` et exécute deux scénarios possibles :

### Scénario A : Des changesets sont en attente

Si des fichiers `.changeset/*.md` (hors `README.md`) existent, le workflow **crée ou met à jour une PR "Version Packages"** qui :

- Bump les versions dans les `package.json` concernés
- Met à jour les fichiers `CHANGELOG.md` de chaque package
- Supprime les fichiers changeset consommés
- Accumule les changesets si tu push plusieurs fois avant de merger

### Scénario B : Aucun changeset en attente

Si la PR "Version Packages" vient d'être mergée (plus de changesets), le workflow :

1. **Build** tous les packages (`yarn turbo build lint`)
2. **Publie** sur npm les packages dont la version a changé (`yarn changeset publish`)

## Versioning sémantique

Choisis le bon type de bump selon la nature du changement :

| Type | Quand l'utiliser | Exemple |
|------|-----------------|---------|
| `patch` | Bug fix, correction mineure | `1.0.0` → `1.0.1` |
| `minor` | Nouvelle fonctionnalité rétro-compatible | `1.0.0` → `1.1.0` |
| `major` | Breaking change (API modifiée/supprimée) | `1.0.0` → `2.0.0` |

## Configuration

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `.changeset/config.json` | Configuration Changesets (access public, branche main) |
| `.github/workflows/release.yml` | Workflow CI de release |
| `.npmrc` | Authentification npm via le token `NPM_TOKEN` |

### Secrets GitHub requis

| Secret | Description |
|--------|-------------|
| `GITHUB_TOKEN` | Fourni automatiquement par GitHub Actions |
| `NPM_TOKEN` | Token npm de type **Automation** (évite le 2FA en CI) |

### Organisation npm

Les packages sont scopés sous `@lec`, ce qui nécessite une [organisation npm `lec`](https://www.npmjs.com/org/lec). Les packages sont configurés en accès **public** via `publishConfig` dans chaque `package.json`.

## Commandes utiles

```bash
# Créer un changeset interactif
yarn changeset

# Voir le statut des changesets en attente
yarn changeset status

# Appliquer les versions localement (fait automatiquement en CI)
yarn changeset version

# Publier manuellement (fait automatiquement en CI)
yarn changeset publish
```

## FAQ

### Je ne veux pas publier, juste modifier du code interne

Si ton changement ne touche que des packages internes (configs, outils de dev, docs), tu n'as pas besoin de créer un changeset. La CI build et lint quand même, mais ne crée pas de PR de version.

### J'ai oublié de créer un changeset

Pas de problème. Crée-le après coup et push-le sur `main`. Il sera pris en compte au prochain run de la CI.

### Comment publier un package pour la première fois ?

Le premier `yarn changeset publish` gère la publication initiale. Assure-toi que :
- L'organisation `@lec` existe sur npm
- Le `NPM_TOKEN` est configuré dans les secrets GitHub
- Le `package.json` contient `"publishConfig": { "access": "public" }`
