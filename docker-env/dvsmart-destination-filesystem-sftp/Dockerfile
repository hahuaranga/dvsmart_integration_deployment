# Dockerfile para servidor SFTP
# Base: atmoz/sftp para simplicidad y features out-of-the-box
FROM atmoz/sftp:alpine

# Etiquetas para trazabilidad
LABEL maintainer="hahuaranga@indracompany.com" \
	  org.opencontainers.image.title="dvsmart-destination-filesystem-sftp" \
      org.opencontainers.image.description="SFTP server con chroot directo en /etc/organized_data" \
      org.opencontainers.image.version="1.0.0"

# Expose puerto SFTP estándar
EXPOSE 22

# Comando por defecto: Heredado de atmoz/sftp; configura vía env vars
CMD ["/entrypoint"]