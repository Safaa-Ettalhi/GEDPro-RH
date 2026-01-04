# Instructions de configuration

## Installation des dépendances manquantes

Après avoir cloné le projet, exécutez :

```bash
npm install
```

Cela installera automatiquement toutes les dépendances, y compris :
- `@nestjs/swagger` pour la documentation API

## Configuration initiale

1. **Copier le fichier d'environnement** :
```bash
cp env.example .env
```

2. **Configurer les variables d'environnement** dans `.env`

3. **Démarrer les services Docker** :
```bash
docker-compose -f docker-compose.dev.yml up -d
```

4. **Installer les dépendances** :
```bash
npm install
```

5. **Démarrer l'application** :
```bash
npm run start:dev
```

## Accès aux services

- **Application API**: http://localhost:3000
- **Swagger Documentation**: http://localhost:3000/api
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **PostgreSQL**: localhost:5432
- **MongoDB**: localhost:27017

## Tests

```bash
# Installer les dépendances si nécessaire
npm install

# Lancer les tests unitaires
npm run test

# Lancer les tests avec couverture
npm run test:cov

# Lancer les tests E2E
npm run test:e2e
```

## Vérification de l'installation

1. Vérifier que l'application démarre sans erreur
2. Accéder à http://localhost:3000/api pour voir Swagger
3. Tester l'endpoint de santé (si configuré)
4. Vérifier les logs Docker pour les bases de données

