#!/bin/bash

# =============================================
# 1. ACTUALIZAR REPOSITORIOS (Git Pull)
# =============================================

echo "Starting Git Pull on main repositories..."

# Guarda la ubicación actual y se mueve al directorio raíz (../.. desde scripts_local_env/)
# La ubicación actual es: ~/tools/docVaultSmart/dvsmart_integration_deployment/scripts_local_env
pushd ../.. 

# Rutas relativas al nuevo directorio actual (el raíz: ~/tools/docVaultSmart)
REPOS=("dvsmart_integration_deployment" "dvsmart_integration_helm" "dvsmart_reorganization_api")

for REPO in "${REPOS[@]}"; do
    if [ -d "$REPO" ]; then
        echo "--> Pulling changes in $REPO..."
        (
            # Entra al repositorio
            cd "$REPO" || continue 
            # Ejecuta el pull
            git pull
        )
    else
        echo "Warning: Directory $REPO not found. Skipping pull."
    fi
done

echo "Git Pull finished."

# Regresa al directorio original (donde estaba el script)
popd 

# =============================================
# 2. COMPILAR EL PROYECTO
# =============================================

echo "Starting Maven compilation..."

# El comando mvn se ejecuta desde el directorio original (scripts_local_env)
# Asumiendo que ../pom.xml apunta a dvsmart_integration_deployment/pom.xml,
# o necesitas ajustar el path si el pom.xml es el del directorio raíz.

# Si el pom.xml está en dvsmart_integration_deployment/
mvn -f ../pom.xml clean install -DskipTests=true

# Si el pom.xml está en el directorio raíz (../../pom.xml)
# mvn -f ../../pom.xml clean install -DskipTests=true

echo "Compilation finished."