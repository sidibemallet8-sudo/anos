# ANOS - Architecture

## Vue d'ensemble

ANOS est un compresseur intelligent composé de plusieurs modules :

```
┌─────────────────────────────────────┐
│         CLI Interface               │
│  (compress, extract, info)          │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│       Archive Manager               │
│  (read/write .anos format)          │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│    Compression Engine               │
│  (deflateRaw, brotli, etc)          │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│    File System Walker               │
│  (traverse directories)             │
└─────────────────────────────────────┘
```

## Modules

### CLI (`src/cli.js`)
- Point d'entrée de la ligne de commande
- Parse les arguments utilisateur
- Appelle les fonctions principales

### Archive Manager (`src/anos.js`)
- Gère le format .anos
- Crée des manifestes
- Compresse/décompresse les fichiers
- Valide l'intégrité

### Format .anos

Format JSON compressé en gzip :

```json
{
  "magic": "ANOS1",
  "version": 1,
  "createdAt": "2024-01-01T00:00:00Z",
  "type": "file|directory",
  "name": "project-name",
  "files": [
    {
      "path": "file/path",
      "size": 1024,
      "compressedSize": 512,
      "hash": "sha256-hash",
      "data": "base64-encoded-compressed-data",
      "algorithm": "deflateRaw"
    }
  ]
}
```

## Flux de compression

1. **Scan** : Traverser le répertoire et collecter les fichiers
2. **Compression** : Compresser chaque fichier avec deflateRaw
3. **Manifest** : Créer un manifeste JSON avec métadonnées
4. **Archive** : Compresser le manifeste avec gzip
5. **Écriture** : Écrire le fichier .anos

## Flux de décompression

1. **Lecture** : Lire le fichier .anos
2. **Decompression** : Décompresser avec gunzip
3. **Parse** : Parser le manifeste JSON
4. **Validation** : Valider les hashes
5. **Extraction** : Décompresser et écrire les fichiers

## Plans futurs

### Phase 2 : Optimisation IA
- Quantization pour modèles
- Pruning automatique
- Recommandations intelligentes

### Phase 3 : Écosystème
- API REST
- Intégrations CI/CD
- Dashboard web
- Plateforme de partage

### Phase 4 : Production
- Support Enterprise
- Cloud ANOS
- Monitoring
- Partenariats
