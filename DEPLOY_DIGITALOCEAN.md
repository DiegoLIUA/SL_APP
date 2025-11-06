# Despliegue en DigitalOcean

Esta guía resume el flujo recomendado para publicar la aplicación en tu dominio usando un Droplet de DigitalOcean y la imagen Docker incluida en el repositorio.

## 1. Preparación local

1. **Variables sensibles.** Crea el archivo `server/.env.production` a partir de `server/env.production.example` y rellena al menos `JWT_SECRET` con un valor largo y aleatorio.
2. **Compilación opcional local.** Si tienes Docker Desktop instalado, puedes verificar que la imagen construye correctamente:
   ```powershell
   docker compose build
   docker compose up -d
   docker compose logs -f streetlifting
   ```
   Detén los contenedores cuando termines:
   ```powershell
   docker compose down
   ```

## 2. Crear la infraestructura en DigitalOcean

1. **Droplet.** Desde el panel de DigitalOcean crea un Droplet basado en Ubuntu 22.04, plan Basic (1 vCPU / 2 GB RAM es suficiente de inicio) y habilita backups automáticos si quieres.
2. **Acceso.** Añade tu clave SSH pública al Droplet (más cómodo que contraseña). Si estás en Windows, usa `ssh-keygen` desde PowerShell y luego `ssh root@IP_DEL_DROPLET`.
3. **Firewall (opcional).** Activa un Firewall de DigitalOcean permitiendo HTTP (80), HTTPS (443) y SSH (22).

## 3. Configurar el Droplet

Una vez dentro del Droplet ejecuta los siguientes comandos:

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable docker --now
```

Clona el proyecto (o haz pull desde tu repo privado):

```bash
git clone https://github.com/tu-usuario/tu-repo.git streetlifting
cd streetlifting
```

Configura el archivo de entorno (puedes copiarlo vía `scp` desde tu máquina o crearlo in situ):

```bash
cp server/env.production.example server/.env.production
nano server/.env.production
```

Edita `JWT_SECRET` y cualquier otra variable que necesites. Guarda y cierra.

## 4. Desplegar con Docker Compose

En el Droplet:

```bash
docker compose pull   # opcional si ya publicaste una imagen build
docker compose build
docker compose up -d
```

Esto levantará el contenedor Node.js sirviendo la API en `:5000` y el front-end compilado. Los datos de SQLite viven en el volumen `streetlifting_data` montado en `/data` dentro del contenedor.

Revisa los logs:

```bash
docker compose logs -f streetlifting
```

Si todo está correcto deberías ver `Server running on port 5000` y la app accesible en `http://IP_DEL_DROPLET:5000`.

## 5. Configurar el dominio y HTTPS

1. **DNS.** En el panel de DigitalOcean crea un registro A apuntando `app.tudominio.com` a la IP del Droplet. Espera la propagación (puede tardar minutos).
2. **Reverse proxy + SSL.** Instala Caddy o Nginx con Certbot para terminar TLS. Ejemplo rápido con Caddy (renueva automáticamente):
   ```bash
   sudo apt install -y caddy
   sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
   app.tudominio.com {
       reverse_proxy 127.0.0.1:5000
   }
   EOF
   sudo systemctl reload caddy
   ```
   Con eso tendrás HTTPS automático. Si prefieres Nginx, configura un `server` block con `proxy_pass http://127.0.0.1:5000;` y usa Certbot.

## 6. Actualizar la aplicación

Cuando hagas cambios en el código:

```bash
git pull
docker compose build
docker compose up -d
```

Docker recreará el contenedor con la nueva build. Los datos se conservan porque viven en el volumen.

## 7. Copias de seguridad

- **SQLite.** El archivo está en el volumen Docker mapeado al host (`/var/lib/docker/volumes/streetlifting_data/_data/streetlifting.db`). Programa un `cron` que copie ese archivo a un bucket S3/Spaces.
- **Git.** Mantén el repositorio en GitHub/GitLab para no depender del Droplet.

## 8. Escalado futuro

- Cuando quieras mover la base de datos a Postgres gestionado, podrás cambiar `SQLITE_PATH` por `DATABASE_URL` y ajustar el backend (migración pendiente).
- Si prefieres automatizar builds, sube la imagen a un Container Registry (DigitalOcean, GitHub) y cambia `docker compose` para usar `image:` en lugar de `build:`.

Con estos pasos tendrás la aplicación servida en tu dominio bajo HTTPS usando la infraestructura de DigitalOcean.

