# Deployment en AWS EC2 (Capa Gratuita)

## 1. Crear Instancia EC2

1. Entrá a AWS Console → EC2
2. Click en "Launch Instance"
3. Configuración:
   - **Nombre**: fichadas-server
   - **AMI**: Ubuntu Server 22.04 LTS (Free tier eligible)
   - **Tipo**: t2.micro (Free tier eligible)
   - **Key pair**: Crear nueva o usar existente (descargá el .pem)
   - **Security Group**: Crear con estas reglas:
     - SSH (22) - Tu IP
     - HTTP (80) - 0.0.0.0/0
     - Custom TCP (3001) - 0.0.0.0/0
4. Launch

## 2. Conectar por SSH

```bash
ssh -i tu-key.pem ubuntu@TU-IP-PUBLICA
```

## 3. Instalar Dependencias en EC2

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar pnpm
npm install -g pnpm

# Instalar PM2 (para mantener el servidor corriendo)
npm install -g pm2

# Verificar instalación
node --version
pnpm --version
```

## 4. Clonar y Configurar el Proyecto

```bash
# Clonar repo
git clone https://github.com/TU-USUARIO/fichadas.git
cd fichadas

# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend
cd ../frontend
pnpm install

# Buildear frontend
pnpm build
```

## 5. Configurar Variables de Entorno

```bash
# Crear archivo .env en backend/
cd ../backend
nano .env
```

Contenido del .env:
```
PORT=3001
NODE_ENV=production
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-password-de-app
```

## 6. Iniciar Servidor con PM2

```bash
# Desde backend/
pm2 start server.js --name fichadas-backend

# Guardar configuración para reinicio automático
pm2 save
pm2 startup
```

## 7. Configurar Nginx (Opcional - Recomendado)

```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/fichadas
```

Contenido:
```nginx
server {
    listen 80;
    server_name TU-IP-PUBLICA;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Activar sitio
sudo ln -s /etc/nginx/sites-available/fichadas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 8. Acceder a la Aplicación

- **Con Nginx**: http://TU-IP-PUBLICA
- **Sin Nginx**: http://TU-IP-PUBLICA:3001

## Comandos Útiles

```bash
# Ver logs
pm2 logs fichadas-backend

# Reiniciar servidor
pm2 restart fichadas-backend

# Detener servidor
pm2 stop fichadas-backend

# Ver estado
pm2 status

# Actualizar código
cd ~/fichadas
git pull
cd frontend && pnpm build
pm2 restart fichadas-backend
```

## Notas Importantes

- La base de datos SQLite se crea automáticamente en `backend/fichadas.db`
- Los backups se guardan en `backend/backups/`
- El servidor se reinicia automáticamente si falla (gracias a PM2)
- Para dominio propio, configurá Route53 y SSL con Let's Encrypt

## Troubleshooting

Si el servidor no arranca:
```bash
pm2 logs --err
```

Si hay problemas de permisos:
```bash
sudo chown -R ubuntu:ubuntu ~/fichadas
```

Si falta alguna dependencia:
```bash
cd ~/fichadas/backend && npm install
cd ~/fichadas/frontend && pnpm install && pnpm build
```
