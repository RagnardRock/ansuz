# Passer la base de Neon au VPS

Ce guide déplace la base PostgreSQL d'Ansuz de Neon (Londres, offre gratuite) vers le VPS, à côté du serveur.
Comptez environ 30 minutes. Le site reste en ligne. Seuls les avis écrits pendant la copie (étape 4) seraient perdus,
donc faites-le à une heure calme.

Les commandes `ssh …` se tapent dans PowerShell sur le PC. Les autres se tapent **sur le VPS**, une fois connecté avec `ssh ubuntu@<ip-du-vps>`.

## 0. Déployer le nouveau code (toujours sur Neon)

Le serveur utilise maintenant le driver `pg`, qui fonctionne aussi avec Neon. Après la fusion de la PR :

```powershell
git pull
.\deploy-backend.ps1
```

Vérifiez que le site marche encore normalement : la base n'a pas changé, seule la façon de s'y connecter a changé.

## 1. Connaître la version de Postgres chez Neon

Dans la console Neon, ouvrez l'éditeur SQL et lancez :

```sql
SELECT version();
```

Notez le numéro (16 ou 17). Le VPS doit avoir **la même version ou une plus récente**.

## 2. Installer PostgreSQL sur le VPS

```bash
sudo apt update
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y   # dépôt officiel PostgreSQL
sudo apt install -y postgresql-17                                   # ou 16 si Neon est en 16
psql --version
```

Par défaut, Postgres n'écoute que sur la machine elle-même (`localhost`). N'ouvrez **pas** le port 5432 au monde extérieur.

## 3. Créer l'utilisateur et la base

Choisissez un mot de passe long (par exemple avec `openssl rand -base64 24`) :

```bash
sudo -u postgres psql -c "CREATE ROLE ansuz LOGIN PASSWORD 'MOT_DE_PASSE_ICI';"
sudo -u postgres createdb -O ansuz ansuz
```

## 4. Copier la base depuis Neon

Récupérez l'URL de connexion Neon (tableau de bord › Connect, branche `production`, **sans** « pooled »).
Mettez-la entre guillemets simples :

```bash
pg_dump 'postgresql://…neon.tech/neondb?sslmode=require' --no-owner --no-acl -Fc -f ~/ansuz-neon.dump
sudo -u postgres pg_restore -d ansuz --no-owner --role=ansuz ~/ansuz-neon.dump
```

Vérifiez que les chiffres sont les mêmes que dans l'éditeur SQL de Neon :

```bash
sudo -u postgres psql -d ansuz -c "SELECT (SELECT count(*) FROM works) AS oeuvres, (SELECT count(*) FROM reviews) AS avis, (SELECT count(*) FROM users) AS membres;"
```

## 5. Brancher le serveur sur la nouvelle base

Dans le dossier du backend sur le VPS, modifiez `.env` :

```bash
cd ~/apps/ansuz/backend/backend
cp .env .env.neon            # garde l'ancienne config, pour revenir en arrière si besoin
nano .env
```

Remplacez la ligne `DATABASE_URL=…` par :

```
DATABASE_URL=postgresql://ansuz:MOT_DE_PASSE_ICI@localhost:5432/ansuz
```

Puis redémarrez :

```bash
pm2 restart ansuz-backend --update-env
pm2 logs ansuz-backend --lines 20
```

Testez le site : connexion, une fiche, le fil, poster un avis.

**Pour revenir en arrière** : `cp .env.neon .env && pm2 restart ansuz-backend --update-env`.

## 6. Sauvegardes automatiques chaque nuit

Copiez le script depuis le PC :

```powershell
scp backend\scripts\sauvegarde.sh ubuntu@<ip-du-vps>:~/sauvegarde-ansuz.sh
```

Puis sur le VPS :

```bash
chmod +x ~/sauvegarde-ansuz.sh
# Donne à l'utilisateur ubuntu le droit de lire la base (pour pg_dump), sans pouvoir la modifier
sudo -u postgres createuser ubuntu
sudo -u postgres psql -c "GRANT pg_read_all_data TO ubuntu;"
~/sauvegarde-ansuz.sh        # premier essai, doit afficher « Sauvegarde OK »
crontab -e
```

Ajoutez cette ligne (sauvegarde à 4 h du matin) :

```
0 4 * * * /home/ubuntu/sauvegarde-ansuz.sh >> /home/ubuntu/sauvegardes/ansuz.log 2>&1
```

Les 14 derniers jours sont gardés dans `~/sauvegardes/ansuz`. Pensez à en rapatrier une sur le PC de temps en temps
(`scp ubuntu@<ip-du-vps>:~/sauvegardes/ansuz/*.dump D:\Sauvegardes\`) : si le VPS tombe, les sauvegardes restées dessus tombent avec lui.

**Restaurer une sauvegarde** : `sudo -u postgres pg_restore -d ansuz --clean --no-owner --role=ansuz ~/sauvegardes/ansuz/ansuz-AAAA-MM-JJ.dump`

## 7. Après quelques semaines

Quand tout tourne bien, vous pouvez supprimer le projet Neon (tableau de bord › Settings › Delete project).
