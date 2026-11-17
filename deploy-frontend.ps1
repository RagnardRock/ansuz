$VPS = "ubuntu@164.132.44.113"
$REMOTE_PATH = "~/apps/ansuz/frontend"
$LOCAL_PATH = "d:\Projets\AppLecture\frontend"
Write-Host "Building frontend..." -ForegroundColor Yellow
Push-Location $LOCAL_PATH
npm run build

if ($LASTEXITCODE -ne 0) {
  Write-Host "Build failed!" -ForegroundColor Red
  exit 1
}

Write-Host "Deploying to VPS..." -ForegroundColor Yellow
ssh $VPS "rm -rf ${REMOTE_PATH}/dist"
scp -r $LOCAL_PATH\dist "${VPS}:${REMOTE_PATH}/dist"
Pop-Location
Write-Host "Done!" -ForegroundColor Green
