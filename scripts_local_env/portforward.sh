#!/bin/bash

# Archivo donde se guardarán los PID de los procesos en background
PID_FILE="/tmp/funhogar-portforwards.pid"

# Lista de comandos port-forward
COMMANDS=(
  "kubectl port-forward svc/funhogar-support 30050:8080 -n funhogar"
  "kubectl port-forward svc/funhogar-event-api 30051:8080 -n funhogar"
  "kubectl port-forward svc/funhogar-mongodb 30052:27017 -n funhogar"
  "kubectl port-forward svc/funhogar-postgresql 30053:5432 -n funhogar"
  "kubectl port-forward svc/funhogar-rabbitmq 30054:5672 -n funhogar"
  "kubectl port-forward svc/funhogar-rabbitmq 30055:15672 -n funhogar"
  "kubectl port-forward svc/funhogar-sbi-rest-adapter 30056:8080 -n funhogar"
  "kubectl port-forward svc/funhogar-sbi-ws-adapter 30057:8080 -n funhogar"
  "kubectl port-forward svc/funhogar-agenda-api 30058:8080 -n funhogar"
  "kubectl port-forward svc/funhogar-nbi-adapter 30059:8080 -n funhogar"
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