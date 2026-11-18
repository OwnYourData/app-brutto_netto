# Kleiner, unprivilegierter nginx, der nur die statischen Dateien aus src/ ausliefert.
FROM nginxinc/nginx-unprivileged:stable-alpine
COPY nginx/security-headers.conf /etc/nginx/security-headers.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY src/ /usr/share/nginx/html/
EXPOSE 8080
