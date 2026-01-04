# 🔄 Guide GitHub Actions - Comment ça fonctionne

## 📚 Qu'est-ce que GitHub Actions ?

GitHub Actions est un système d'automatisation intégré à GitHub qui permet d'exécuter des tâches (tests, builds, déploiements) automatiquement lors d'événements GitHub (push, pull request, etc.).

## 🏗️ Architecture de base

```
┌─────────────────────────────────────────┐
│         Événement GitHub                │
│  (push, pull_request, etc.)             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Workflow déclenché              │
│  (.github/workflows/ci.yml)             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Jobs exécutés                   │
│  (lint, test, build)                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Résultats affichés               │
│  (✅ Succès ou ❌ Échec)                 │
└─────────────────────────────────────────┘
```

## 📁 Structure d'un workflow

Un workflow GitHub Actions est un fichier YAML qui définit :

1. **Quand** déclencher le workflow (événements)
2. **Quoi** faire (jobs et steps)
3. **Où** l'exécuter (runners)

### Emplacement des fichiers

Les workflows doivent être placés dans :
```
.github/workflows/*.yml
```

## 🔍 Analyse de notre workflow CI

Analysons le fichier `.github/workflows/ci.yml` ligne par ligne :

### 1. Déclencheurs (Triggers)

```yaml
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
```

**Explication** :
- Le workflow se déclenche sur un **push** vers `main` ou `develop`
- Le workflow se déclenche sur une **pull request** vers `main` ou `develop`

**Exemples** :
- ✅ Vous poussez du code sur `main` → Workflow déclenché
- ✅ Vous créez une PR vers `develop` → Workflow déclenché
- ❌ Vous poussez sur une autre branche → Workflow non déclenché

### 2. Jobs

Un **job** est une série d'étapes qui s'exécutent sur le même runner (machine virtuelle).

Notre workflow contient 3 jobs :

#### Job 1 : Lint

```yaml
lint:
  name: Lint
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npm run lint
```

**Explication** :
1. **`runs-on: ubuntu-latest`** : Exécute sur une machine Ubuntu
2. **`steps`** : Liste des actions à effectuer
   - `checkout@v4` : Récupère le code du repository
   - `setup-node@v4` : Installe Node.js 20
   - `npm ci` : Installe les dépendances
   - `npm run lint` : Lance ESLint

**Résultat** :
- ✅ Si le lint passe → Job réussi
- ❌ Si des erreurs de lint → Job échoue, workflow s'arrête

#### Job 2 : Test

```yaml
test:
  name: Test
  runs-on: ubuntu-latest
  services:
    postgres: ...
    mongodb: ...
    minio: ...
  steps:
    - ...
    - run: npm run test
    - run: npm run test:e2e
    - run: npm run test:cov
```

**Explication** :
1. **`services`** : Démarre des conteneurs Docker pour les bases de données
   - PostgreSQL, MongoDB, MinIO sont disponibles pendant les tests
2. **`steps`** :
   - Installe les dépendances
   - Lance les tests unitaires
   - Lance les tests E2E
   - Génère le rapport de couverture

**Services Docker** :
```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: geduser
      POSTGRES_PASSWORD: gedpassword
      POSTGRES_DB: geddb
    ports:
      - 5432:5432
```

Ces services sont accessibles via `localhost:5432` pendant l'exécution des tests.

**Résultat** :
- ✅ Si tous les tests passent → Job réussi
- ❌ Si un test échoue → Job échoue, workflow s'arrête

#### Job 3 : Build

```yaml
build:
  name: Build
  runs-on: ubuntu-latest
  needs: [lint, test]
  steps:
    - ...
    - run: npm run build
```

**Explication** :
1. **`needs: [lint, test]`** : Ce job attend que `lint` et `test` soient terminés avec succès
2. **`npm run build`** : Compile l'application TypeScript

**Résultat** :
- ✅ Si le build réussit → Job réussi, workflow terminé
- ❌ Si le build échoue → Job échoue, workflow terminé en erreur

## 🔄 Flux d'exécution complet

```
1. Vous poussez du code sur GitHub
   ↓
2. GitHub détecte l'événement (push sur main)
   ↓
3. GitHub Actions démarre le workflow
   ↓
4. Job "lint" s'exécute en parallèle
   ├─ Checkout du code
   ├─ Installation Node.js
   ├─ Installation dépendances
   └─ Exécution ESLint
   ↓
5. Job "test" s'exécute en parallèle
   ├─ Démarrage services Docker (PostgreSQL, MongoDB, MinIO)
   ├─ Checkout du code
   ├─ Installation Node.js
   ├─ Installation dépendances
   ├─ Tests unitaires
   ├─ Tests E2E
   └─ Génération coverage
   ↓
6. Si lint ET test réussissent → Job "build" s'exécute
   ├─ Checkout du code
   ├─ Installation Node.js
   ├─ Installation dépendances
   └─ Compilation TypeScript
   ↓
7. Workflow terminé ✅ ou ❌
```

## 🎯 Actions utilisées

### `actions/checkout@v4`
- **Rôle** : Récupère le code source du repository
- **Équivalent** : `git clone`

### `actions/setup-node@v4`
- **Rôle** : Installe Node.js et configure npm
- **Options** :
  - `node-version: '20'` : Version de Node.js
  - `cache: 'npm'` : Cache les dépendances npm pour accélérer

## 🔐 Variables d'environnement

Les variables d'environnement sont définies dans chaque job :

```yaml
env:
  POSTGRES_HOST: localhost
  POSTGRES_PORT: 5432
  JWT_SECRET: test-secret-key
  # etc.
```

Ces variables sont disponibles dans tous les `steps` du job.

## 📊 Visualisation dans GitHub

Une fois le workflow exécuté, vous pouvez voir :

1. **Onglet "Actions"** dans GitHub
2. **Liste des workflows** exécutés
3. **Détails de chaque job** :
   - ✅ Vert = Succès
   - ❌ Rouge = Échec
   - ⏳ Jaune = En cours
4. **Logs détaillés** de chaque step

## 🚀 Comment tester localement

### Option 1 : Act (outil local)

```bash
# Installer act
# Windows: choco install act-cli
# Mac: brew install act
# Linux: voir https://github.com/nektos/act

# Tester le workflow localement
act -j lint
act -j test
act -j build
```

### Option 2 : Tester manuellement

```bash
# Tester chaque étape manuellement
npm ci
npm run lint
npm run test
npm run build
```

## 🐛 Dépannage

### Le workflow ne se déclenche pas

**Vérifications** :
- ✅ Le fichier est dans `.github/workflows/`
- ✅ Le fichier a l'extension `.yml` ou `.yaml`
- ✅ La syntaxe YAML est correcte
- ✅ La branche correspond (`main` ou `develop`)

### Les tests échouent dans GitHub Actions mais passent localement

**Causes possibles** :
- Variables d'environnement manquantes
- Services Docker non démarrés
- Différences de versions Node.js

**Solution** : Vérifier les logs dans l'onglet Actions de GitHub

### Les services Docker ne démarrent pas

**Vérifications** :
- ✅ Les images Docker sont correctes
- ✅ Les ports ne sont pas en conflit
- ✅ Les health checks sont configurés

## 📈 Améliorations possibles

### 1. Cache des dépendances

```yaml
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

### 2. Matrices de tests (plusieurs versions Node.js)

```yaml
strategy:
  matrix:
    node-version: [18, 20, 22]
```

### 3. Déploiement automatique

```yaml
deploy:
  needs: build
  if: github.ref == 'refs/heads/main'
  steps:
    - name: Deploy to production
      run: echo "Deploying..."
```

### 4. Notifications

```yaml
- name: Notify on failure
  if: failure()
  uses: actions/github-script@v6
  with:
    script: |
      // Envoyer une notification
```

## 📚 Ressources

- [Documentation officielle GitHub Actions](https://docs.github.com/en/actions)
- [Marketplace des actions](https://github.com/marketplace?type=actions)
- [Syntaxe YAML pour workflows](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)

## 🎓 Résumé

**GitHub Actions = Automatisation CI/CD intégrée à GitHub**

1. **Déclenchement** : Événements GitHub (push, PR, etc.)
2. **Exécution** : Jobs sur des runners (machines virtuelles)
3. **Résultat** : ✅ Succès ou ❌ Échec visible dans GitHub

Notre workflow CI :
- ✅ Vérifie le code (lint)
- ✅ Teste l'application (tests unitaires + E2E)
- ✅ Compile l'application (build)
- ✅ Génère un rapport de couverture

Tout cela **automatiquement** à chaque push ou pull request ! 🚀

