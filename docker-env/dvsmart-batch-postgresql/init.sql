-- 1. Usuario
CREATE USER dvsmart_ms WITH ENCRYPTED PASSWORD 'OgxjdNEeQl';

-- 2. Base (dueño = el usuario)
CREATE DATABASE dvsmart OWNER dvsmart_ms;

-- 3. Conectarse a la nueva base para crear objetos dentro de ella
\connect dvsmart;

-- 4. Esquema propio (dueño = el usuario)
CREATE SCHEMA IF NOT EXISTS dvsmart_ms AUTHORIZATION dvsmart_ms;

-- 5. Que sus conexiones entren directamente a su esquema
ALTER ROLE dvsmart_ms SET search_path = dvsmart_ms;

-- 6. (Opcional) quitarle privilegios sobre public si no los quiere
REVOKE CREATE ON SCHEMA public FROM dvsmart_ms;