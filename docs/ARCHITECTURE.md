# Architecture de l'application GEDPro

## Vue d'ensemble

GEDPro est une plateforme de Gestion Électronique de Documents (GED) orientée RH, construite avec **NestJS**, utilisant une architecture modulaire et des bases de données hybrides (PostgreSQL + MongoDB).

## Architecture générale

### Stack technique

- **Framework Backend**: NestJS 11.x
- **Base de données relationnelle**: PostgreSQL 16 (via TypeORM)
- **Base de données NoSQL**: MongoDB 7 (via Mongoose)
- **Stockage d'objets**: MinIO
- **Authentification**: JWT (JSON Web Tokens)
- **WebSocket**: Socket.io pour les notifications temps réel
- **OCR**: Tesseract.js pour l'extraction de texte
- **Calendrier**: Google Calendar API

### Architecture en couches

```
┌─────────────────────────────────────────┐
│         Controllers (API REST)          │
│  (Validation, Guards, DTOs)             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Services (Logique métier)        │
│  (Business Logic, Orchestration)       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Repositories / Models            │
│  (TypeORM, Mongoose)                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Bases de données                │
│  (PostgreSQL, MongoDB, MinIO)          │
└─────────────────────────────────────────┘
```

## Modules principaux

### 1. Auth Module
- **Responsabilité**: Authentification et autorisation
- **Entités**: User (PostgreSQL)
- **Schemas**: Session (MongoDB)
- **Fonctionnalités**:
  - Inscription/Connexion
  - Gestion des sessions JWT
  - Guards pour la protection des routes

### 2. Organizations Module
- **Responsabilité**: Gestion des organisations et multi-tenant
- **Entités**: Organization, UserOrganization (PostgreSQL)
- **Fonctionnalités**:
  - Création/gestion d'organisations
  - Attribution de rôles (ADMIN, MANAGER, USER)
  - Isolation des données par organisation

### 3. Candidates Module
- **Responsabilité**: Gestion des candidats
- **Entités**: Candidate, CandidateDocument (PostgreSQL)
- **Schemas**: CandidateStateHistory (MongoDB)
- **Fonctionnalités**:
  - CRUD des candidats
  - Gestion des états (Nouveau, Présélectionné, etc.)
  - Historique des changements d'état
  - Association de documents

### 4. Documents Module
- **Responsabilité**: Gestion documentaire
- **Entités**: Document (PostgreSQL)
- **Services**: MinioService, OcrService
- **Fonctionnalités**:
  - Upload de documents vers MinIO
  - Extraction OCR avec Tesseract.js
  - Traitement asynchrone des documents
  - Génération d'URLs signées

### 5. Skills Module
- **Responsabilité**: Gestion des compétences
- **Entités**: Skill, CandidateSkill (PostgreSQL)
- **Services**: SkillsExtractionService
- **Fonctionnalités**:
  - Extraction automatique de compétences depuis les documents
  - Association manuelle de compétences
  - Recherche de candidats par compétences

### 6. Forms Module
- **Responsabilité**: Formulaires dynamiques
- **Entités**: Form, FormField, JobOffer (PostgreSQL)
- **Fonctionnalités**:
  - Création de formulaires personnalisés
  - Types de champs: texte, nombre, email, fichier
  - Association aux offres d'emploi

### 7. Interviews Module
- **Responsabilité**: Gestion des entretiens
- **Entités**: Interview (PostgreSQL)
- **Services**: GoogleCalendarService
- **Fonctionnalités**:
  - Création/modification d'entretiens
  - Synchronisation avec Google Calendar
  - Gestion des participants
  - Notifications automatiques

### 8. Notifications Module
- **Responsabilité**: Notifications temps réel
- **Schemas**: Notification (MongoDB)
- **Gateway**: NotificationsGateway (WebSocket)
- **Fonctionnalités**:
  - Notifications push en temps réel
  - Historique des notifications
  - Marquage lu/non lu

## Flux de données

### Upload et traitement de document

```
1. Client → POST /documents/upload
2. DocumentsController → DocumentsService.upload()
3. MinioService.uploadFile() → Stockage dans MinIO
4. Document créé en PostgreSQL
5. ProcessDocumentAsync() → OcrService.extractText()
6. Texte extrait sauvegardé
7. SkillsService.extractAndAssociateSkills()
8. Compétences associées au candidat
9. Notifications envoyées via WebSocket
```

### Création d'entretien

```
1. Client → POST /interviews
2. InterviewsController → InterviewsService.create()
3. Validation de la date et des participants
4. Interview créé en PostgreSQL
5. Changement d'état du candidat (si nécessaire)
6. GoogleCalendarService.createEvent() (si configuré)
7. Notifications envoyées aux participants
8. Réponse avec l'interview créé
```

## Sécurité

### Authentification
- JWT avec expiration configurable
- Sessions stockées dans MongoDB
- Middleware de validation des tokens

### Autorisation
- Guards basés sur les rôles (ADMIN, MANAGER, USER)
- Isolation des données par organisation
- Vérification des permissions à chaque requête

### Protection des données
- Hashage des mots de passe avec bcrypt
- URLs signées pour les documents (MinIO)
- Validation des entrées avec class-validator

## Bases de données

### PostgreSQL (TypeORM)
**Utilisé pour**: Données relationnelles structurées
- Users, Organizations, UserOrganizations
- Candidates, CandidateDocuments
- Documents, Forms, FormFields, JobOffers
- Interviews, Skills, CandidateSkills

**Avantages**:
- Intégrité référentielle
- Transactions ACID
- Requêtes complexes avec relations

### MongoDB (Mongoose)
**Utilisé pour**: Données non structurées et historiques
- Sessions utilisateurs
- Historique des changements d'état des candidats
- Notifications

**Avantages**:
- Flexibilité du schéma
- Performance pour les écritures fréquentes
- Stockage de documents JSON

### MinIO
**Utilisé pour**: Stockage d'objets (fichiers)
- Documents uploadés (CV, diplômes, contrats)
- Organisation par organisation et type

## Services externes

### Google Calendar API
- Synchronisation automatique des entretiens
- Création/mise à jour/suppression d'événements
- Invitations automatiques des participants

### Tesseract.js (OCR)
- Extraction de texte depuis les documents PDF/images
- Traitement asynchrone pour ne pas bloquer l'API
- Support de multiples formats (PDF, PNG, JPG)

## Patterns utilisés

### Repository Pattern
- Abstraction de l'accès aux données
- Facilite les tests unitaires avec des mocks

### Service Layer Pattern
- Logique métier isolée dans les services
- Controllers légers, services lourds

### Dependency Injection
- Injection de dépendances via le système NestJS
- Facilite le test et la maintenance

### Event-Driven (partiel)
- Notifications via WebSocket
- Traitement asynchrone des documents

## Scalabilité

### Horizontal
- Application stateless (sessions en MongoDB)
- MinIO peut être distribué
- Bases de données peuvent être répliquées

### Vertical
- Optimisation des requêtes avec indexes
- Cache possible pour les requêtes fréquentes
- Traitement asynchrone pour les opérations lourdes (OCR)

## Points d'amélioration futurs

1. **Cache**: Redis pour les sessions et données fréquentes
2. **Queue**: Bull/BullMQ pour le traitement asynchrone
3. **Search**: Elasticsearch pour la recherche avancée
4. **Monitoring**: Prometheus + Grafana
5. **Logging**: Centralisé avec ELK Stack
6. **API Gateway**: Pour la gestion des versions et rate limiting

