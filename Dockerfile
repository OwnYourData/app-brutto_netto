# Kleiner, unprivilegierter nginx, der nur die statischen Dateien aus src/ ausliefert.
FROM nginxinc/nginx-unprivileged:stable-alpine
USER root
COPY nginx/security-headers.conf /etc/nginx/security-headers.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY src/ /usr/share/nginx/html/
# Leserechte unabhängig von den Dateirechten im Arbeitsordner (dort oft 600).
RUN chmod 0644 /etc/nginx/security-headers.conf /etc/nginx/conf.d/default.conf \
 && chmod -R a+rX /usr/share/nginx/html
USER 101
EXPOSE 8080
