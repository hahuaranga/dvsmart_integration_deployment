# Dockerfile para servidor SFTP
# Base: atmoz/sftp para simplicidad y features out-of-the-box
FROM atmoz/sftp:alpine

LABEL maintainer="hahuaranga@indracompany.com" \
      org.opencontainers.image.title="dvsmart-source-filesystem-sftp" \
      org.opencontainers.image.description="SFTP server con chroot directo en /etc/disorganized_data" \
      org.opencontainers.image.version="1.0.0"

# 1. Copiar el script de generación de documentos a una ubicación PATH
# Se copia a /usr/local/bin para que sea accesible fácilmente
COPY script/generar_documentos.sh /usr/local/bin/generar_documentos.sh

# 2. Asignar permisos de ejecución
RUN chmod +x /usr/local/bin/generar_documentos.sh

# Expose puerto SFTP estándar
EXPOSE 22

# Comando por defecto: Heredado de atmoz/sftp; configura vía env vars
CMD ["/entrypoint"]