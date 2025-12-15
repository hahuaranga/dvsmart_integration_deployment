# Usar la última imagen oficial de MongoDB desde Docker Hub
FROM mongo:latest

LABEL maintainer="Hector Huaranga <hahuaranga@indracompany.com>"
LABEL description="This example Dockerfile installs MongoDB for development purposes"

# Establecer variables de entorno con valores predeterminados
ENV MONGO_INITDB_ROOT_USERNAME=admin
ENV MONGO_INITDB_ROOT_PASSWORD=password
ENV MONGO_INITDB_DATABASE=dvsmart-ms
ENV MONGO_USER=dvsmart_user
ENV MONGO_PASSWORD=eoQQqfTyMd

# Copiar scripts de inicialización personalizados
COPY 01_init_collections.js /docker-entrypoint-initdb.d/

# Exponer el puerto de MongoDB
EXPOSE 27017

# Comando por defecto para iniciar MongoDB
CMD ["mongod"]