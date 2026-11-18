# Kleiner, unprivilegierter nginx, der nur die statischen Dateien aus src/ ausliefert.
# CSP=strict (Standard): nur eigene Dateien. CSP=ads: zusätzlich die Adressen des Google-Ads-Tags,
# nötig, sobald in src/assets/consent-config.js eine Conversion-ID eingetragen ist.
FROM nginxinc/nginx-unprivileged:stable-alpine
ARG CSP=strict
USER root
COPY nginx/security-headers.conf nginx/security-headers-ads.conf /tmp/csp/
RUN if [ "$CSP" = "ads" ]; then cp /tmp/csp/security-headers-ads.conf /etc/nginx/security-headers.conf; \
    elif [ "$CSP" = "strict" ]; then cp /tmp/csp/security-headers.conf /etc/nginx/security-headers.conf; \
    else echo "CSP muss strict oder ads sein" && exit 1; fi \
 && rm -rf /tmp/csp
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY src/ /usr/share/nginx/html/
# Leserechte unabhängig von den Dateirechten im Arbeitsordner (dort oft 600).
RUN chmod 0644 /etc/nginx/security-headers.conf /etc/nginx/conf.d/default.conf \
 && chmod -R a+rX /usr/share/nginx/html
USER 101
EXPOSE 8080
