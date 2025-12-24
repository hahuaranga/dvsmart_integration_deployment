# Usar la última imagen oficial de PostgreSQL desde Docker Hub
FROM postgres:16-alpine

LABEL maintainer="Hector Huaranga <hahuaranga@indracompany.com>"
LABEL description="This example Dockerfile installs Postgres for development purposes"

# Establecer variables de entorno con valores predeterminados
ENV POSTGRES_PASSWORD=postgres

# Copiar scripts de inicialización personalizados (opcional)
COPY init.sql /docker-entrypoint-initdb.d/

# Exponer el puerto de PostgreSQL
EXPOSE 5432

# Comando por defecto para iniciar PostgreSQL
CMD ["postgres"]