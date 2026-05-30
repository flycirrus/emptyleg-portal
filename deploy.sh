#!/bin/bash
set -e

echo "=== HYPE Empty Legs Portal — Deployment ==="
echo ""

# -----------------------------------------------
# 1. Check prerequisites
# -----------------------------------------------
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "Docker installed. Please log out and back in, then re-run this script."
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "ERROR: docker compose not found. Please install Docker Compose v2."
    exit 1
fi

# -----------------------------------------------
# 2. Create .env if not exists
# -----------------------------------------------
if [ ! -f .env.production ]; then
    echo "Creating .env.production — PLEASE EDIT THIS FILE with your real values!"
    cat > .env.production << 'ENVEOF'
# Database
DB_PASSWORD=CHANGE_ME_secure_password_here

# NextAuth
NEXTAUTH_SECRET=CHANGE_ME_run_openssl_rand_base64_32

# Google OAuth (create at https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Leon.aero
LEON_API_URL=https://HYP.leon.aero
LEON_REFRESH_TOKEN=PASTE_YOUR_TOKEN_HERE

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=fly@hypejets.com
SMTP_PASS=CHANGE_ME

NOTIFICATION_EMAIL=fly@hypejets.com

# Cron Secret
CRON_SECRET=CHANGE_ME_random_secret
ENVEOF
    echo ""
    echo ">>> .env.production created. Edit it now:"
    echo "    nano .env.production"
    echo ""
    echo "Then re-run: bash deploy.sh"
    exit 0
fi

# -----------------------------------------------
# 3. Build & Start
# -----------------------------------------------
echo "Loading .env.production..."
export $(grep -v '^#' .env.production | xargs)

echo "Building Docker images..."
docker compose build

echo "Starting services..."
docker compose up -d

echo "Waiting for database to be ready..."
sleep 5

# -----------------------------------------------
# 4. Run migrations & seed
# -----------------------------------------------
echo "Running database migrations..."
docker compose exec app npx prisma migrate deploy

echo "Seeding database..."
docker compose exec app npx tsx prisma/seed.ts

# -----------------------------------------------
# 5. SSL Certificate (Let's Encrypt)
# -----------------------------------------------
echo ""
echo "=== SSL Setup ==="
echo "To set up HTTPS with Let's Encrypt, run:"
echo ""
echo "  sudo apt install certbot"
echo "  sudo certbot certonly --webroot -w /var/www/certbot -d emptylegs.hypejets.com"
echo ""
echo "Then restart nginx:"
echo "  docker compose restart nginx"
echo ""

# -----------------------------------------------
# 6. Initial sync
# -----------------------------------------------
echo "Triggering initial flight sync..."
curl -s -X POST http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer ${CRON_SECRET}" | echo "Sync result: $(cat)"

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Your app is running at: https://emptylegs.hypejets.com"
echo ""
echo "Services:"
echo "  - App:      http://localhost:3000"
echo "  - Postgres: localhost:5432"
echo "  - Nginx:    ports 80/443"
echo "  - Cron:     auto-sync every 15 min"
echo ""
echo "Admin login: renaldofly@gmail.com / (password from ADMIN_PASSWORD)"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f app    # View app logs"
echo "  docker compose restart app    # Restart app"
echo "  docker compose down           # Stop everything"
echo "  docker compose up -d          # Start everything"
