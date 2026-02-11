---
sidebar_position: 1
slug: /intro
---

# Introduction

Bienvenue dans la documentation des packages internes **LEC**.

Ce monorepo contient un ensemble de librairies TypeScript modulaires, conçues pour être réutilisées à travers les différents projets LEC et publiées sur npm.

## Packages disponibles

| Package | Description | Version |
|---------|-------------|---------|
| [`@lec-core/ddd-tools`](/docs/packages/ddd-tools/overview) | Primitives Domain-Driven Design : Entity, ValueObject, Result, Command, Repository, Pagination | `1.0.0` |
| [`@lec-core/alert`](/docs/packages/alert-manager/overview) | Système d'alertes multi-providers avec Discord, Email et détection de pannes | `1.0.0` |

## Architecture du monorepo

```
LEC_INTERN_DEV/
├── packages/
│   ├── alert-manager/      → @lec-core/alert
│   ├── ddd-tools/          → @lec-core/ddd-tools
│   ├── tsup-config/        → @lec-core/tsup-config
│   └── typescript-config/  → @lec-core/typescript-config
├── apps/
│   └── docs/               → Ce site de documentation
├── turbo.json
└── package.json
```

## Stack technique

- **TypeScript** 5.9 en mode strict
- **tsup** pour le build (CJS + ESM + `.d.ts`)
- **Turborepo** pour l'orchestration du monorepo
- **Changesets** pour le versioning et la publication npm
- **Biome** pour le linting et le formatting
- **Yarn 4** comme package manager

## Installation d'un package

```bash
# Avec yarn
yarn add @lec-core/ddd-tools

# Avec npm
npm install @lec-core/ddd-tools
```
