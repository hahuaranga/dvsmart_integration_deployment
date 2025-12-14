#!/bin/sh

# ==============================================================================
# SCRIPT: generar_documentos.sh
# DESCRIPCIÓN: Crea estructura de carpetas y las llena con archivos PDF dummy.
# COMPATIBILIDAD: sh (Alpine / ash)
# USO: ./generar_documentos.sh <ruta_base> <numero_total_archivos>
# EJEMPLO: ./generar_documentos.sh /etc/disorganized_data 250
# ==============================================================================

# --- Configuración ---
BASE_PATH=${1:-./repo_data} # Usa el primer argumento
TOTAL_FILES=${2:-100}       # Usa el segundo argumento
MAX_SIZE_KB=512             # Tamaño máximo en KB (0.5 MB)
MIN_SIZE_KB=50              # Tamaño mínimo en KB (para variabilidad)

# --- Estructura de Carpetas (Definida como una sola cadena compatible con sh) ---
FOLDER_STRUCTURE_LIST="Clientes/A_Indra/2024/Facturas \
Clientes/B_Telef/2023/Contratos \
Clientes/C_BBVA/2022/Informes \
Clientes/Varios/2024/Soporte \
Proyectos/IT/Archivos_Legales \
Proyectos/HR/Politicas_Internas \
Documentacion_General/Manuales/v1 \
Documentacion_General/Manuales/v2 \
Temporal_Incoming"
# -----------------------------

# Determinar el número de carpetas para la selección aleatoria.
# En sh puro, esto es un cálculo manual. Si añades o quitas una carpeta arriba,
# debes actualizar esta variable.
folder_count=9 

# --- Funciones ---

# Función para generar un archivo dummy con tamaño específico y extensión PDF
generate_dummy_pdf() {
    local file_path=$1
    local file_name=$2
    local target_kb=$3

    # Usamos /dev/urandom para contenido aleatorio (asegurando el tamaño)
    dd if=/dev/urandom of="${file_path}/${file_name}.tmp" bs=1024 count="${target_kb}" status=none
    
    if [ $? -eq 0 ]; then
        mv "${file_path}/${file_name}.tmp" "${file_path}/${file_name}.pdf"
    else
        echo "Error: Falló la creación del archivo ${file_path}/${file_name}.tmp"
        rm -f "${file_path}/${file_name}.tmp"
    fi
}

# --- Ejecución Principal ---

echo "=================================================="
echo "🚀 Iniciando generación de archivos dummy..."
echo "Ruta base: ${BASE_PATH}"
echo "Archivos a crear: ${TOTAL_FILES}"
echo "=================================================="

# 1. Crear directorios base y la estructura definida
echo "1. Creando la estructura de directorios..."
# Iteramos sobre la lista de carpetas (separadas por espacios)
for folder in ${FOLDER_STRUCTURE_LIST}; do
    mkdir -p "${BASE_PATH}/${folder}"
done
echo "   ✅ Estructura creada."

# 2. Generar y distribuir los archivos
echo "2. Generando y distribuyendo los archivos..."
file_count=0

while [ "$file_count" -lt "$TOTAL_FILES" ]; do
    # a. Seleccionar una carpeta al azar (índice 1-based, compatible con cut)
    # Fórmula: (( $RANDOM % folder_count ) + 1 )
    rand_index=$(( ($RANDOM % $folder_count) + 1 ))
    
    # Seleccionar la N-ésima carpeta de la lista usando 'cut' (compatible con sh)
    # Se utiliza 'echo' y 'cut' para simular la selección de arrays en sh
    current_folder_name=$(echo "${FOLDER_STRUCTURE_LIST}" | cut -d' ' -f$rand_index)

    target_folder="${BASE_PATH}/${current_folder_name}"
    
    # b. Generar un tamaño aleatorio
    rand_size_kb=$(( $RANDOM % ($MAX_SIZE_KB - $MIN_SIZE_KB + 1) + $MIN_SIZE_KB ))
    
    # c. Generar un nombre de archivo único
    file_id=$(printf "%05d" $((file_count + 1))) 
    file_name="doc_${file_id}_$(date +%s%N)"
    
    # d. Llamar a la función de generación
    generate_dummy_pdf "${target_folder}" "${file_name}" "${rand_size_kb}"
    
    file_count=$((file_count + 1))
    
    # Mostrar progreso
    if [ $((file_count % 20)) -eq 0 ]; then
        echo "   -> Creados: $file_count / $TOTAL_FILES"
    fi
done

echo "=================================================="
echo "🎉 Proceso completado. Archivos creados: $file_count"
echo "=================================================="