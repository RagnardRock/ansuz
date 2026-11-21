$VPS = "ubuntu@164.132.44.113"
$REMOTE_PATH = "~/apps/ansuz/backend/backend"
$LOCAL_PATH = "d:\Projets\AppLecture\backend"

Write-Host "Deploying backend..." -ForegroundColor Yellow

# Copie les fichiers source (sans node_modules ni .env)
scp -r "$LOCAL_PATH\api" "${VPS}:${REMOTE_PATH}/"
scp -r "$LOCAL_PATH\lib" "${VPS}:${REMOTE_PATH}/"
scp "$LOCAL_PATH\server.js" "${VPS}:${REMOTE_PATH}/"
scp "$LOCAL_PATH\package.json" "${VPS}:${REMOTE_PATH}/"
scp "$LOCAL_PATH\package-lock.json" "${VPS}:${REMOTE_PATH}/"

Write-Host "Restarting PM2..." -ForegroundColor Yellow
ssh $VPS "cd $REMOTE_PATH && npm ci --omit=dev && pm2 restart ansuz-backend"

Write-Host "Done!" -ForegroundColor Green
