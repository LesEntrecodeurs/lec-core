---
sidebar_position: 1
---

# Publication npm avec Changesets

Ce guide explique comment les packages `@lec-packages/*` sont automatiquement publiés sur npm via [Changesets](https://github.com/changesets/changesets) et GitHub Actions.

## Vue d'ensemble

```
code + yarn changeset → push main → CI build → publié sur npm
```

Changesets gère le **versioning sémantique** (semver) et la **publication** des packages du monorepo. Chaque changement qui impacte un package publié doit être accompagné d'un fichier changeset décrivant le type de modification.

## Packages publiés

| Package | npm | Accès |
|---------|-----|-------|
| `@lec-packages/ddd-tools` | [@lec-packages/ddd-tools](https://www.npmjs.com/package/@lec-packages/ddd-tools) | Public |
| `@lec-packages/alert` | [@lec-packages/alert](https://www.npmjs.com/package/@lec-packages/alert) | Public |

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
"@lec-packages/alert": minor
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

Le workflow GitHub Actions (`.github/workflows/release.yml`) se déclenche à chaque push sur `main` qui touche `packages/`, `.changeset/`, `package.json` ou `yarn.lock`. Les modifications dans `apps/docs/` ne déclenchent **pas** le workflow.

Le workflow exécute les étapes suivantes :

1. **Install** les dépendances
2. **Build & Lint** tous les packages (`yarn turbo build lint`)
3. **Version** — applique les changesets en attente (`yarn changeset version`) : bump les versions et met à jour les `CHANGELOG.md`
4. **Publish** — publie sur npm les packages dont la version a changé (`yarn changeset publish`)

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
| `NPM_TOKEN` | Token npm **Granular Access Token** avec "Bypass 2FA" activé |

### Configuration du token npm

npm exige le 2FA pour publier sur le scope `@lec-packages`. Pour la CI, il faut un token avec bypass :

1. Va sur https://www.npmjs.com/settings/tokens
2. Clique **"Generate New Token"** → **"Granular Access Token"**
3. Configure :
   - **Token name** : `github-actions-publish`
   - **Expiration** : 90 jours (max)
   - **Bypass two-factor authentication** : ✅ Coché
   - **Packages and scopes** : `Read and write` sur `@lec-packages`
   - **Organizations** : `lec-packages` avec `Read and write`
4. Copie le token généré
5. Ajoute-le dans GitHub : Settings → Secrets → `NPM_TOKEN`

> **Note** : Le token expire tous les 90 jours. Pense à le renouveler.

### Organisation npm

Les packages sont scopés sous `@lec-packages`, ce qui nécessite une [organisation npm `lec-packages`](https://www.npmjs.com/org/lec-packages). Les packages sont configurés en accès **public** via `publishConfig` dans chaque `package.json`.

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

## Publication manuelle

Si la CI échoue ou si tu dois publier manuellement :

### Prérequis

1. **2FA activé** sur ton compte npm (obligatoire)
2. Connecté via `npm login`

### Étapes

```bash
# 1. Build les packages
yarn build

# 2. Publier ddd-tools (si modifié)
cd packages/ddd-tools
npm publish --access public

# 3. Publier alert (si modifié)
cd ../alert-manager
npm publish --access public
```

npm te demandera ton code 2FA (via security key ou authenticator app).

### Dépendances workspace

**Important** : Les dépendances entre packages publiés doivent utiliser des **versions npm**, pas `workspace:*`.

```json
// ❌ Mauvais - ne fonctionne pas quand publié sur npm
"dependencies": {
  "@lec-packages/ddd-tools": "workspace:^"
}

// ✅ Bon - fonctionne partout
"dependencies": {
  "@lec-packages/ddd-tools": "^1.0.1"
}
```

Les dépendances `workspace:*` vers des packages **non publiés** (tsup-config, typescript-config) restent en `workspace:*` dans `devDependencies`.

## FAQ

### Je ne veux pas publier, juste modifier du code interne

Si ton changement ne touche que des packages internes (configs, outils de dev, docs), tu n'as pas besoin de créer un changeset. La CI ne se déclenche même pas si seuls les fichiers dans `apps/docs/` sont modifiés.

### J'ai oublié de créer un changeset

Pas de problème. Crée-le après coup et push-le sur `main`. Il sera pris en compte au prochain run de la CI.

### Comment publier un package pour la première fois ?

Le premier `yarn changeset publish` gère la publication initiale. Assure-toi que :
- L'organisation `@lec-packages` existe sur npm
- Le `NPM_TOKEN` est configuré dans les secrets GitHub
- Le `package.json` contient `"publishConfig": { "access": "public" }`
