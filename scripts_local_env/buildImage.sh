#!/bin/bash
REGISTRY=$1
IMAGE_NAME=$2
TAG=$3

cd ../docker-env/
docker build -t $IMAGE_NAME ./$IMAGE_NAME
docker image tag $IMAGE_NAME:latest $REGISTRY/$IMAGE_NAME:$TAG
docker image push $REGISTRY/$IMAGE_NAME:$TAG

# Opcional: Limpiar imágenes locales
docker rmi $IMAGE_NAME:latest $REGISTRY/$IMAGE_NAME:$TAG