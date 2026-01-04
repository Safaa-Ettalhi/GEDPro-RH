# Guide d'installation et de configuration

## Prérequis

- **Node.js**: Version 20 ou supérieure
- **Docker**: Version 20.10 ou supérieure (recommandé)
- **Docker Compose**: Version 2.0 ou supérieure (recommandé)
- **npm**: Version 9 ou supérieure (inclus avec Node.js)

## Installation avec Docker (Recommandé)

### 1. Cloner le repository

```bash
git clone <repository-url>
cd breif
```

### 2. Configurer les variables d'environnement

Copiez le fichier `env.example` vers `.env` :

```bash
cp env.example .env
```

Éditez le fichier `.env` et configurez les variables nécessaires :

```env
# Application
NODE_ENV=development
PORT=3000

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=geduser
POSTGRES_PASSWORD=gedpassword
POSTGRES_DB=geddb

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/gedpro
MONGO_DB=gedpro

# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=gedpro-documents

# JWT Configuration
JWT_SECRET=votre-secret-jwt-tres-securise-changez-moi
JWT_EXPIRES_IN=86400

# Google Calendar (Optionnel)
GOOGLE_CLIENT_ID=votre-client-id
GOOGLE_CLIENT_SECRET=votre-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_REFRESH_TOKEN=votre-refresh-token
TIMEZONE=Europe/Paris
```

### 3. Démarrer les services avec Docker Compose

#### Mode développement (avec hot-reload)

```bash
# Démarrer uniquement les bases de données
docker-compose -f docker-compose.dev.yml up -d

# Installer les dépendances
npm install

# Démarrer l'application en mode développement
npm run start:dev
```

#### Mode production

```bash
# Démarrer tous les services (app + bases de données)
docker-compose up -d --build
```

### 4. Vérifier l'installation

L'application devrait être accessible sur `http://localhost:3000`

Vérifiez les logs :

```bash
# Logs de l'application
docker-compose logs -f app

# Logs de PostgreSQL
docker-compose logs -f postgres

# Logs de MongoDB
docker-compose logs -f mongodb

# Logs de MinIO
docker-compose logs -f minio
```

## Installation locale (sans Docker)

### 1. Installer les dépendances système

#### PostgreSQL
- **Windows**: Télécharger depuis [postgresql.org](https://www.postgresql.org/download/windows/)
- **macOS**: `brew install postgresql@16`
- **Linux**: `sudo apt-get install postgresql-16`

#### MongoDB
- **Windows/macOS/Linux**: Télécharger depuis [mongodb.com](https://www.mongodb.com/try/download/community)

#### MinIO
- Télécharger depuis [min.io](https://min.io/download) ou utiliser Docker :
```bash
docker run -d -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

### 2. Configurer les bases de données

#### PostgreSQL

```bash
# Créer la base de données
createdb geddb

# Ou via psql
psql -U postgres
CREATE DATABASE geddb;
CREATE USER geduser WITH PASSWORD 'gedpassword';
GRANT ALL PRIVILEGES ON DATABASE geddb TO geduser;
```

#### MongoDB

```bash
# MongoDB démarre automatiquement après installation
# Vérifier avec
mongosh --eval "db.adminCommand('ping')"
```

### 3. Installer les dépendances Node.js

```bash
npm install
```

### 4. Configurer les variables d'environnement

Copiez et configurez `.env` comme décrit ci-dessus.

### 5. Démarrer l'application

```bash
# Mode développement
npm run start:dev

# Mode production
npm run build
npm run start:prod
```

## Configuration Google Calendar (Optionnel)

### 1. Créer un projet Google Cloud

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un nouveau projet
3. Activer l'API Google Calendar

### 2. Créer des credentials OAuth 2.0

1. Aller dans "APIs & Services" > "Credentials"
2. Créer des identifiants OAuth 2.0
3. Configurer l'URI de redirection : `http://localhost:3000/auth/google/callback`
4. Télécharger le fichier JSON des credentials

### 3. Obtenir un refresh token

Utiliser le script d'authentification ou suivre la documentation Google OAuth 2.0.

### 4. Configurer dans `.env`

```env
GOOGLE_CLIENT_ID=votre-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-client-secret
GOOGLE_REFRESH_TOKEN=votre-refresh-token
```

## Vérification de l'installation

### 1. Tester l'API

```bash
# Vérifier que l'application répond
curl http://localhost:3000

# Créer un utilisateur
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 2. Vérifier les bases de données

#### PostgreSQL
```bash
psql -U geduser -d geddb -c "\dt"
```

#### MongoDB
```bash
mongosh gedpro --eval "db.getCollectionNames()"
```

#### MinIO
- Accéder à la console : `http://localhost:9001`
- Identifiants : `minioadmin` / `minioadmin`

## Dépannage

### Problème de connexion à PostgreSQL

```bash
# Vérifier que PostgreSQL est démarré
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS

# Vérifier les logs
docker-compose logs postgres
```

### Problème de connexion à MongoDB

```bash
# Vérifier que MongoDB est démarré
sudo systemctl status mongod  # Linux
brew services list | grep mongodb  # macOS

# Vérifier les logs
docker-compose logs mongodb
```

### Problème de connexion à MinIO

```bash
# Vérifier que MinIO est démarré
docker ps | grep minio

# Vérifier les logs
docker-compose logs minio
```

### Port déjà utilisé

Si le port 3000 est déjà utilisé :

```bash
# Modifier le port dans .env
PORT=3001

# Ou arrêter le processus utilisant le port
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/macOS
lsof -ti:3000 | xargs kill -9
```

## Commandes utiles

### Docker

```bash
# Arrêter tous les services
docker-compose down

# Arrêter et supprimer les volumes (⚠️ supprime les données)
docker-compose down -v

# Reconstruire les images
docker-compose build --no-cache

# Voir les logs en temps réel
docker-compose logs -f

# Accéder au shell d'un conteneur
docker-compose exec app sh
docker-compose exec postgres psql -U geduser -d geddb
```

### Développement

```bash
# Lancer les tests
npm run test

# Lancer les tests avec coverage
npm run test:cov

# Lancer les tests E2E
npm run test:e2e

# Linter le code
npm run lint

# Formater le code
npm run format
```

## Prochaines étapes

1. Consulter la [documentation de l'API](API.md) (à créer)
2. Lire le [guide d'architecture](ARCHITECTURE.md)
3. Consulter la [documentation des dépendances](DEPENDENCIES.md)

