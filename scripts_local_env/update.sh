#!/bin/bash

# --- 🟢 Definición de la lista de imágenes ---
# Nota: Incluimos solo los nombres base de las imágenes, sin host ni tag.
IMAGE_LIST=(
			"dvsmart-source-filesystem-sftp"
			"dvsmart-destination-filesystem-sftp"
			"dvsmart-reorganization-api"
			"dvsmart-catalog-mongodb"
			"dvsmart-indexing-api"
			)
BASE_DIR=dvsmart_integration_helm
NAMESPACE=dvsmart

./01_updateRepo.sh

# Pasamos la lista de imágenes como argumentos a 02_updateImages.sh
./02_updateImages.sh "${IMAGE_LIST[@]}"

helm uninstall r1 ../../$BASE_DIR -n $NAMESPACE
sleep 5
helm install r1 ../../$BASE_DIR -n $NAMESPACE --set global.env=loc