# ANOS - Guide de démarrage

## Installation

### Depuis npm (à venir)
```bash
npm install -g @anos/cli
```

### Depuis source
```bash
git clone https://github.com/sidibemallet8-sudo/anos.git
cd anos
npm install
npm start -- compress ./mon-dossier
```

## Utilisation basique

### Compresser un fichier
```bash
anos compress ./mon-fichier.txt
# Crée mon-fichier.txt.anos
```

### Compresser un dossier
```bash
anos compress ./mon-projet
# Crée mon-projet.anos
```

### Extraire une archive
```bash
anos extract ./archive.anos
# Extrait dans ./extracted/
```

### Voir les infos
```bash
anos info ./archive.anos
# Affiche les statistiques
```

## Exemples

### Compresser un projet Node.js
```bash
cd mon-app
anos compress . --exclude node_modules
# Envoie à un serveur
# Sur le serveur :
anos extract mon-app.anos
```

### Compresser un modèle IA
```bash
anos compress ./model.pt
# Réduit la taille du modèle
```

### Backup d'un projet
```bash
anos compress ./important-project backup-2024.anos
# Crée une sauvegarde compressée
```

## Cas d'usage

- **Déploiement** : Réduire la taille des déploiements
- **Partage** : Envoyer des projets rapidement
- **Backup** : Archiver des données efficacement
- **Distribution** : Partager des modèles IA légers
- **Stockage** : Économiser de l'espace disque
