#!/usr/bin/env bash
# Sauvegarde quotidienne de la base Ansuz (à lancer par cron sur le VPS).
# Garde les 14 derniers jours dans ~/sauvegardes/ansuz.
set -euo pipefail

DOSSIER="$HOME/sauvegardes/ansuz"
mkdir -p "$DOSSIER"
FICHIER="$DOSSIER/ansuz-$(date +%Y-%m-%d).dump"

# Format personnalisé (-Fc) : compressé, restaurable avec pg_restore.
pg_dump --no-owner --no-acl -Fc -d ansuz -f "$FICHIER"

# Supprime les sauvegardes de plus de 14 jours (uniquement les fichiers ansuz-*.dump de ce dossier).
find "$DOSSIER" -maxdepth 1 -name 'ansuz-*.dump' -mtime +14 -delete

echo "Sauvegarde OK : $FICHIER ($(du -h "$FICHIER" | cut -f1))"
