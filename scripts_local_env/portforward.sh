#!/bin/bash

# Archivo donde se guardarán los PID de los procesos en background
PID_FILE="/tmp/dvsmart-portforwards.pid"

# Lista de comandos port-forward
COMMANDS=(
"kubectl port-forward svc/dvsmart-catalog-mongodb 30000:27017 -n dvsmart"
"kubectl port-forward svc/dvsmart-destination-filesystem-sftp 30001:22 -n dvsmart"
"kubectl port-forward svc/dvsmart-source-filesystem-sftp 30002:22 -n dvsmart"
"kubectl port-forward svc/dvsmart-reorganization-api 30003:8080 -n dvsmart"
"kubectl port-forward svc/dvsmart-indexing-api 30004:8080 -n dvsmart"
)

start() {
  echo "Iniciando port-forward en background..."
  > "$PID_FILE" # Vacía el archivo de PIDs

  for cmd in "${COMMANDS[@]}"; do
    bash -c "$cmd" &
    echo $! >> "$PID_FILE"
  done

  echo "Todos los port-forward están ejecutándose. PIDs guardados en $PID_FILE"
}

stop() {
  echo "Deteniendo procesos de port-forward..."
  if [[ -f "$PID_FILE" ]]; then
    while read -r pid; do
      echo "Deteniendo PID $pid"
      kill "$pid" 2>/dev/null
    done < "$PID_FILE"
    rm -f "$PID_FILE"
    echo "Todos los procesos han sido detenidos."
  else
    echo "No hay archivo de PID. ¿Ya están detenidos?"
  fi
}

case "$1" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  *)
    echo "Uso: $0 {start|stop}"
    exit 1
    ;;
esac