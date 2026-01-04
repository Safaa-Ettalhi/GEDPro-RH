# Documentation des dépendances

Ce document décrit toutes les bibliothèques et dépendances externes utilisées dans le projet GEDPro, leur rôle, version et justification.

## Dépendances principales (dependencies)

### Framework et Core

#### @nestjs/common (^11.0.1)
- **Rôle**: Module de base NestJS contenant les décorateurs, pipes, guards, interceptors
- **Version**: 11.0.1
- **Justification**: Framework principal, fournit les fonctionnalités de base (Injectable, Controller, Module, etc.)

#### @nestjs/core (^11.0.1)
- **Rôle**: Core du framework NestJS, gestion de l'injection de dépendances
- **Version**: 11.0.1
- **Justification**: Nécessaire pour le fonctionnement du framework

#### @nestjs/platform-express (^11.0.1)
- **Rôle**: Adapter Express pour NestJS
- **Version**: 11.0.1
- **Justification**: Permet d'utiliser Express comme serveur HTTP sous-jacent

#### @nestjs/config (^4.0.2)
- **Rôle**: Gestion de la configuration via variables d'environnement
- **Version**: 4.0.2
- **Justification**: Centralise la gestion de la configuration, validation des variables d'environnement

### Base de données

#### @nestjs/typeorm (^11.0.0)
- **Rôle**: Intégration TypeORM pour PostgreSQL
- **Version**: 11.0.0
- **Justification**: ORM pour PostgreSQL, gestion des entités relationnelles, migrations

#### typeorm (^0.3.28)
- **Rôle**: ORM TypeScript pour bases de données relationnelles
- **Version**: 0.3.28
- **Justification**: Fournit les fonctionnalités de base de TypeORM (Repository, Entity, etc.)

#### pg (^8.16.3)
- **Rôle**: Driver PostgreSQL pour Node.js
- **Version**: 8.16.3
- **Justification**: Connexion native à PostgreSQL, utilisé par TypeORM

#### @nestjs/mongoose (^11.0.4)
- **Rôle**: Intégration Mongoose pour MongoDB
- **Version**: 11.0.4
- **Justification**: ODM pour MongoDB, gestion des schémas et modèles

#### mongoose (^9.0.2)
- **Rôle**: ODM MongoDB pour Node.js
- **Version**: 9.0.2
- **Justification**: Gestion des modèles MongoDB, validation, middleware

### Authentification et Sécurité

#### @nestjs/jwt (^11.0.2)
- **Rôle**: Module JWT pour NestJS
- **Version**: 11.0.2
- **Justification**: Génération et validation des tokens JWT

#### @nestjs/passport (^11.0.5)
- **Rôle**: Intégration Passport pour NestJS
- **Version**: 11.0.5
- **Justification**: Framework d'authentification, stratégies JWT

#### passport (^0.7.0)
- **Rôle**: Framework d'authentification middleware
- **Version**: 0.7.0
- **Justification**: Base de Passport, stratégies d'authentification

#### passport-jwt (^4.0.1)
- **Rôle**: Stratégie JWT pour Passport
- **Version**: 4.0.1
- **Justification**: Authentification basée sur JWT

#### bcrypt (^6.0.0)
- **Rôle**: Hashage des mots de passe
- **Version**: 6.0.0
- **Justification**: Sécurisation des mots de passe avec algorithme bcrypt

### Validation et Transformation

#### class-validator (^0.14.3)
- **Rôle**: Validation des DTOs avec décorateurs
- **Version**: 0.14.3
- **Justification**: Validation automatique des données d'entrée

#### class-transformer (^0.5.1)
- **Rôle**: Transformation d'objets (plain to class, class to plain)
- **Version**: 0.5.1
- **Justification**: Conversion entre objets JavaScript et classes TypeScript

#### @nestjs/mapped-types (^2.1.0)
- **Rôle**: Types mappés pour DTOs (PartialType, PickType, etc.)
- **Version**: 2.1.0
- **Justification**: Réutilisation de DTOs avec transformations

### WebSocket

#### @nestjs/websockets (^11.1.11)
- **Rôle**: Support WebSocket pour NestJS
- **Version**: 11.1.11
- **Justification**: Base pour les WebSockets

#### @nestjs/platform-socket.io (^11.1.11)
- **Rôle**: Adapter Socket.io pour NestJS
- **Version**: 11.1.11
- **Justification**: Implémentation WebSocket avec Socket.io

#### socket.io (^4.8.3)
- **Rôle**: Bibliothèque WebSocket bidirectionnelle
- **Version**: 4.8.3
- **Justification**: Notifications temps réel, communication client-serveur

### Stockage et Fichiers

#### minio (^8.0.6)
- **Rôle**: Client MinIO pour stockage d'objets
- **Version**: 8.0.6
- **Justification**: Upload, téléchargement, gestion des fichiers dans MinIO

#### multer (^2.0.2)
- **Rôle**: Middleware pour gestion des uploads de fichiers
- **Version**: 2.0.2
- **Justification**: Traitement des fichiers multipart/form-data

#### @types/multer (^2.0.0)
- **Rôle**: Types TypeScript pour Multer
- **Version**: 2.0.0
- **Justification**: Support TypeScript pour Multer

### OCR et Extraction

#### tesseract.js (^7.0.0)
- **Rôle**: OCR (Optical Character Recognition) en JavaScript
- **Version**: 7.0.0
- **Justification**: Extraction de texte depuis images et PDFs

#### pdf-parse (^2.4.5)
- **Rôle**: Parsing de fichiers PDF
- **Version**: 2.4.5
- **Justification**: Extraction de texte depuis PDFs

### Intégrations externes

#### googleapis (^169.0.0)
- **Rôle**: Client officiel Google APIs
- **Version**: 169.0.0
- **Justification**: Intégration avec Google Calendar API

### Utilitaires

#### rxjs (^7.8.1)
- **Rôle**: Bibliothèque réactive pour programmation asynchrone
- **Version**: 7.8.1
- **Justification**: Utilisé par NestJS pour les observables, streams

#### reflect-metadata (^0.2.2)
- **Rôle**: Support des métadonnées de réflexion
- **Version**: 0.2.2
- **Justification**: Nécessaire pour les décorateurs TypeScript, utilisé par NestJS

## Dépendances de développement (devDependencies)

### Testing

#### @nestjs/testing (^11.0.1)
- **Rôle**: Utilitaires de test pour NestJS
- **Version**: 11.0.1
- **Justification**: Création de modules de test, mocks

#### jest (^30.0.0)
- **Rôle**: Framework de test JavaScript
- **Version**: 30.0.0
- **Justification**: Tests unitaires et d'intégration

#### ts-jest (^29.2.5)
- **Rôle**: Preset Jest pour TypeScript
- **Version**: 29.2.5
- **Justification**: Exécution des tests TypeScript avec Jest

#### @types/jest (^30.0.0)
- **Rôle**: Types TypeScript pour Jest
- **Version**: 30.0.0
- **Justification**: Support TypeScript pour Jest

#### supertest (^7.0.0)
- **Rôle**: Tests HTTP de haut niveau
- **Version**: 7.0.0
- **Justification**: Tests E2E des endpoints API

#### @types/supertest (^6.0.2)
- **Rôle**: Types TypeScript pour Supertest
- **Version**: 6.0.2
- **Justification**: Support TypeScript pour Supertest

### Linting et Formatage

#### eslint (^9.18.0)
- **Rôle**: Linter JavaScript/TypeScript
- **Version**: 9.18.0
- **Justification**: Détection d'erreurs et maintien de la qualité du code

#### @eslint/eslintrc (^3.2.0)
- **Rôle**: Configuration ESLint
- **Version**: 3.2.0
- **Justification**: Configuration moderne d'ESLint

#### @eslint/js (^9.18.0)
- **Rôle**: Règles ESLint JavaScript
- **Version**: 9.18.0
- **Justification**: Règles de base ESLint

#### typescript-eslint (^8.20.0)
- **Rôle**: Règles ESLint pour TypeScript
- **Version**: 8.20.0
- **Justification**: Linting spécifique à TypeScript

#### eslint-config-prettier (^10.0.1)
- **Rôle**: Désactive les règles ESLint en conflit avec Prettier
- **Version**: 10.0.1
- **Justification**: Évite les conflits entre ESLint et Prettier

#### eslint-plugin-prettier (^5.2.2)
- **Rôle**: Intègre Prettier comme règle ESLint
- **Version**: 5.2.2
- **Justification**: Formatage automatique via ESLint

#### prettier (^3.4.2)
- **Rôle**: Formateur de code
- **Version**: 3.4.2
- **Justification**: Formatage automatique du code

### Build et Compilation

#### typescript (^5.7.3)
- **Rôle**: Compilateur TypeScript
- **Version**: 5.7.3
- **Justification**: Compilation du code TypeScript en JavaScript

#### @nestjs/cli (^11.0.0)
- **Rôle**: CLI NestJS pour génération et build
- **Version**: 11.0.0
- **Justification**: Commandes CLI (nest generate, nest build)

#### @nestjs/schematics (^11.0.0)
- **Rôle**: Schémas pour génération de code
- **Version**: 11.0.0
- **Justification**: Templates pour génération automatique

#### ts-loader (^9.5.2)
- **Rôle**: Loader TypeScript pour Webpack
- **Version**: 9.5.2
- **Justification**: Compilation TypeScript dans Webpack (si utilisé)

#### ts-node (^10.9.2)
- **Rôle**: Exécution directe de TypeScript
- **Version**: 10.9.2
- **Justification**: Exécution des fichiers .ts sans compilation préalable

#### tsconfig-paths (^4.2.0)
- **Rôle**: Support des paths TypeScript
- **Version**: 4.2.0
- **Justification**: Résolution des alias de chemins (@/, etc.)

### Types

#### @types/node (^22.10.7)
- **Rôle**: Types TypeScript pour Node.js
- **Version**: 22.10.7
- **Justification**: Support TypeScript pour les APIs Node.js

#### @types/bcrypt (^6.0.0)
- **Rôle**: Types TypeScript pour bcrypt
- **Version**: 6.0.0
- **Justification**: Support TypeScript pour bcrypt

#### @types/express (^5.0.0)
- **Rôle**: Types TypeScript pour Express
- **Version**: 5.0.0
- **Justification**: Support TypeScript pour Express

#### @types/passport-jwt (^4.0.1)
- **Rôle**: Types TypeScript pour passport-jwt
- **Version**: 4.0.1
- **Justification**: Support TypeScript pour passport-jwt

### Utilitaires

#### globals (^16.0.0)
- **Rôle**: Définition des globals pour ESLint
- **Version**: 16.0.0
- **Justification**: Configuration ESLint pour environnements

#### source-map-support (^0.5.21)
- **Rôle**: Support des source maps pour debugging
- **Version**: 0.5.21
- **Justification**: Meilleur debugging avec source maps

## Versions et compatibilité

### Node.js
- **Version requise**: 20.x ou supérieure
- **Justification**: Support des fonctionnalités ES2022, performances améliorées

### npm
- **Version requise**: 9.x ou supérieure
- **Justification**: Compatibilité avec les packages récents

## Gestion des dépendances

### Mise à jour des dépendances

```bash
# Vérifier les dépendances obsolètes
npm outdated

# Mettre à jour les dépendances mineures
npm update

# Mettre à jour une dépendance spécifique
npm install package@latest
```

### Sécurité

```bash
# Auditer les vulnérabilités
npm audit

# Corriger automatiquement
npm audit fix
```

## Alternatives considérées

### Base de données
- **Prisma** : Rejeté car TypeORM est plus mature pour NestJS
- **Sequelize** : Rejeté car TypeORM est plus moderne et mieux intégré

### Stockage
- **AWS S3** : Rejeté car MinIO est gratuit et auto-hébergé
- **Local Storage** : Rejeté car non scalable

### OCR
- **Google Cloud Vision** : Rejeté car nécessite un compte payant
- **Tesseract.js** : Choisi car gratuit et open-source

### WebSocket
- **ws** : Rejeté car Socket.io offre plus de fonctionnalités (rooms, namespaces)
- **SockJS** : Rejeté car moins populaire que Socket.io

