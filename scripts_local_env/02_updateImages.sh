#!/bin/bash

REGISTRY_HOST="192.168.49.2:5000"
IMAGE_TAG="1.0.0"

# --- 🟢 Bucle para procesar los argumentos recibidos ---
# $@ contiene la lista de nombres de imágenes pasadas desde update.sh
for IMAGE_NAME in "$@"; do
    echo "--- Building and pushing image: $IMAGE_NAME:$IMAGE_TAG ---"
    
    # Ejecuta buildImage.sh con el HOST, el nombre de la imagen y el TAG
    ./buildImage.sh "$REGISTRY_HOST" "$IMAGE_NAME" "$IMAGE_TAG"
done

if [ $? -eq 0 ]; then
    echo "Todas las imágenes se procesaron correctamente."
else
    echo "Error: Falló el procesamiento de una o más imágenes."
    exit 1
fi