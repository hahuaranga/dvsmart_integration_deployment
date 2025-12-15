// =============================================
// INICIALIZACIÓN DE LA BASE DE DATOS
// DVSmart Reorganization API - MongoDB Setup
// =============================================

// 1. Autenticación como administrador
//try {
//    db.getSiblingDB('admin').auth(
//        process.env.MONGO_INITDB_ROOT_USERNAME, 
//        process.env.MONGO_INITDB_ROOT_PASSWORD
//    );
//    print("✅ Autenticación como root exitosa");
//} catch (e) {
//    print("❌ Error en autenticación root: " + e);
//    quit(1);
//}

// 2. Creación/Selección de la base de datos
const dbName = process.env.MONGO_INITDB_DATABASE;
db = db.getSiblingDB(dbName);
print("✅ Usando base de datos: " + dbName);

// 3. Creación del usuario de aplicación
try {
    db.createUser({
        user: process.env.MONGO_USER,
        pwd: process.env.MONGO_PASSWORD,
        roles: [
            { role: "readWrite", db: dbName },
            { role: "dbAdmin", db: dbName }
        ]
    });
    print("✅ Usuario de aplicación creado: " + process.env.MONGO_USER);
} catch (e) {
    print("ℹ️  Usuario ya existe o error: " + e);
}

// =============================================
// COLECCIÓN: archivo_index
// Índice de archivos a reorganizar desde SFTP origen
// =============================================

if (!db.getCollectionNames().includes("archivo_index")) {
    try {
        db.createCollection("archivo_index", {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["idUnico", "rutaOrigen", "nombre", "mtime"],
                    properties: {
                        idUnico: {
                            bsonType: "string",
                            description: "Identificador único del archivo (hash SHA-256 de ruta+nombre) - requerido"
                        },
                        rutaOrigen: {
                            bsonType: "string",
                            minLength: 1,
                            description: "Path completo del archivo en SFTP origen - requerido"
                        },
                        nombre: {
                            bsonType: "string",
                            minLength: 1,
                            description: "Nombre del archivo con extensión - requerido"
                        },
                        mtime: {
                            bsonType: "date",
                            description: "Fecha de última modificación del archivo - requerido"
                        },
                        tamanio: {
                            bsonType: "long",
                            minimum: 0,
                            description: "Tamaño del archivo en bytes - opcional"
                        },
                        extension: {
                            bsonType: "string",
                            description: "Extensión del archivo (.txt, .pdf, etc.) - opcional"
                        },
                        indexadoEn: {
                            bsonType: "date",
                            description: "Fecha en que el archivo fue indexado - opcional"
                        }
                    }
                }
            },
            validationLevel: "strict",
            validationAction: "error"
        });
        print("✅ Colección 'archivo_index' creada con validación de esquema");
    } catch (e) {
        print("❌ Error creando colección 'archivo_index': " + e);
    }
} else {
    print("ℹ️  Colección 'archivo_index' ya existe");
}

// Índices para archivo_index
try {
    // Índice único por idUnico
    db.archivo_index.createIndex(
        { "idUnico": 1 }, 
        { unique: true, name: "idx_idUnico_unique" }
    );
    
    // Índice por rutaOrigen (para búsquedas de path)
    db.archivo_index.createIndex(
        { "rutaOrigen": 1 }, 
        { name: "idx_rutaOrigen" }
    );
    
    // Índice por nombre (para búsquedas de archivos)
    db.archivo_index.createIndex(
        { "nombre": 1 }, 
        { name: "idx_nombre" }
    );
    
    // Índice por fecha de modificación (para filtros temporales)
    db.archivo_index.createIndex(
        { "mtime": -1 }, 
        { name: "idx_mtime_desc" }
    );
    
    // Índice compuesto para consultas comunes
    db.archivo_index.createIndex(
        { "indexadoEn": -1, "mtime": -1 }, 
        { name: "idx_indexado_mtime" }
    );
    
    print("✅ Índices creados exitosamente en 'archivo_index'");
} catch (e) {
    print("❌ Error creando índices en 'archivo_index': " + e);
}

// Inserción de documentos de ejemplo en archivo_index
try {
    db.archivo_index.insertMany([
        {
            "idUnico": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
            "rutaOrigen": "/home/testuser/upload/origin/dir1/documento1.pdf",
            "nombre": "documento1.pdf",
            "mtime": new Date("2025-12-10T10:30:00.000Z"),
            "tamanio": NumberLong(1048576),
            "extension": ".pdf",
            "indexadoEn": new Date()
        },
        {
            "idUnico": "b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567",
            "rutaOrigen": "/home/testuser/upload/origin/dir1/imagen1.jpg",
            "nombre": "imagen1.jpg",
            "mtime": new Date("2025-12-11T14:45:00.000Z"),
            "tamanio": NumberLong(524288),
            "extension": ".jpg",
            "indexadoEn": new Date()
        },
        {
            "idUnico": "c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678",
            "rutaOrigen": "/home/testuser/upload/origin/dir2/reporte.xlsx",
            "nombre": "reporte.xlsx",
            "mtime": new Date("2025-12-12T09:15:00.000Z"),
            "tamanio": NumberLong(2097152),
            "extension": ".xlsx",
            "indexadoEn": new Date()
        },
        {
            "idUnico": "d4e5f6789012345678901234567890abcdef1234567890abcdef123456789",
            "rutaOrigen": "/home/testuser/upload/origin/dir3/video.mp4",
            "nombre": "video.mp4",
            "mtime": new Date("2025-12-13T16:20:00.000Z"),
            "tamanio": NumberLong(104857600),
            "extension": ".mp4",
            "indexadoEn": new Date()
        },
        {
            "idUnico": "e5f6789012345678901234567890abcdef1234567890abcdef1234567890a",
            "rutaOrigen": "/home/testuser/upload/origin/notas.txt",
            "nombre": "notas.txt",
            "mtime": new Date("2025-12-13T18:00:00.000Z"),
            "tamanio": NumberLong(4096),
            "extension": ".txt",
            "indexadoEn": new Date()
        }
    ]);
    print("✅ Documentos de ejemplo insertados en 'archivo_index': " + db.archivo_index.countDocuments());
} catch (e) {
    print("❌ Error insertando documentos en 'archivo_index': " + e);
}

// =============================================
// COLECCIÓN: processed_files
// Auditoría de archivos procesados (éxitos y fallos)
// =============================================

if (!db.getCollectionNames().includes("processed_files")) {
    try {
        db.createCollection("processed_files", {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["idUnico", "rutaOrigen", "rutaDestino", "nombre", "status", "processedAt"],
                    properties: {
                        idUnico: {
                            bsonType: "string",
                            description: "Identificador único del archivo (debe coincidir con archivo_index) - requerido"
                        },
                        rutaOrigen: {
                            bsonType: "string",
                            minLength: 1,
                            description: "Path original en SFTP origen - requerido"
                        },
                        rutaDestino: {
                            bsonType: "string",
                            minLength: 1,
                            description: "Path calculado en SFTP destino (hash partitioned) - requerido"
                        },
                        nombre: {
                            bsonType: "string",
                            minLength: 1,
                            description: "Nombre del archivo procesado - requerido"
                        },
                        status: {
                            bsonType: "string",
                            enum: ["SUCCESS", "FAILED"],
                            description: "Estado del procesamiento: SUCCESS o FAILED - requerido"
                        },
                        processedAt: {
                            bsonType: "date",
                            description: "Timestamp de cuando se procesó el archivo - requerido"
                        },
                        errorMessage: {
                            bsonType: "string",
                            description: "Mensaje de error (solo si status=FAILED) - opcional"
                        },
                        jobExecutionId: {
                            bsonType: "long",
                            description: "ID de la ejecución del job batch - opcional"
                        },
                        duracionMs: {
                            bsonType: "long",
                            minimum: 0,
                            description: "Duración del procesamiento en milisegundos - opcional"
                        },
                        intentos: {
                            bsonType: "int",
                            minimum: 1,
                            description: "Número de intentos de procesamiento - opcional"
                        }
                    }
                }
            },
            validationLevel: "strict",
            validationAction: "error"
        });
        print("✅ Colección 'processed_files' creada con validación de esquema");
    } catch (e) {
        print("❌ Error creando colección 'processed_files': " + e);
    }
} else {
    print("ℹ️  Colección 'processed_files' ya existe");
}

// Índices para processed_files
try {
    // Índice único por idUnico
    db.processed_files.createIndex(
        { "idUnico": 1 }, 
        { unique: true, name: "idx_idUnico_unique" }
    );
    
    // Índice compuesto por status y fecha (para consultas de archivos fallidos/exitosos)
    db.processed_files.createIndex(
        { "status": 1, "processedAt": -1 }, 
        { name: "idx_status_processedAt" }
    );
    
    // Índice por fecha de procesamiento (para filtros temporales)
    db.processed_files.createIndex(
        { "processedAt": -1 }, 
        { name: "idx_processedAt_desc" }
    );
    
    // Índice por jobExecutionId (para consultas por job)
    db.processed_files.createIndex(
        { "jobExecutionId": 1 }, 
        { name: "idx_jobExecutionId" }
    );
    
    // Índice por rutaDestino (para verificar archivos en destino)
    db.processed_files.createIndex(
        { "rutaDestino": 1 }, 
        { name: "idx_rutaDestino" }
    );
    
    print("✅ Índices creados exitosamente en 'processed_files'");
} catch (e) {
    print("❌ Error creando índices en 'processed_files': " + e);
}

// Inserción de documentos de ejemplo en processed_files
try {
    db.processed_files.insertMany([
        {
            "idUnico": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
            "rutaOrigen": "/home/testuser/upload/origin/dir1/documento1.pdf",
            "rutaDestino": "/home/testuser/upload/destination/a1/b2/c3/documento1.pdf",
            "nombre": "documento1.pdf",
            "status": "SUCCESS",
            "processedAt": new Date("2025-12-13T22:35:10.123Z"),
            "errorMessage": null,
            "jobExecutionId": NumberLong(1),
            "duracionMs": NumberLong(1234),
            "intentos": 1
        },
        {
            "idUnico": "b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567",
            "rutaOrigen": "/home/testuser/upload/origin/dir1/imagen1.jpg",
            "rutaDestino": "/home/testuser/upload/destination/b2/c3/d4/imagen1.jpg",
            "nombre": "imagen1.jpg",
            "status": "SUCCESS",
            "processedAt": new Date("2025-12-13T22:35:15.456Z"),
            "errorMessage": null,
            "jobExecutionId": NumberLong(1),
            "duracionMs": NumberLong(890),
            "intentos": 1
        },
        {
            "idUnico": "c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678",
            "rutaOrigen": "/home/testuser/upload/origin/dir2/reporte.xlsx",
            "rutaDestino": "/home/testuser/upload/destination/c3/d4/e5/reporte.xlsx",
            "nombre": "reporte.xlsx",
            "status": "FAILED",
            "processedAt": new Date("2025-12-13T22:35:20.789Z"),
            "errorMessage": "Failed to read file from origin SFTP: Connection timeout",
            "jobExecutionId": NumberLong(1),
            "duracionMs": NumberLong(30000),
            "intentos": 3
        },
        {
            "idUnico": "d4e5f6789012345678901234567890abcdef1234567890abcdef123456789",
            "rutaOrigen": "/home/testuser/upload/origin/dir3/video.mp4",
            "rutaDestino": "/home/testuser/upload/destination/d4/e5/f6/video.mp4",
            "nombre": "video.mp4",
            "status": "SUCCESS",
            "processedAt": new Date("2025-12-13T22:36:45.123Z"),
            "errorMessage": null,
            "jobExecutionId": NumberLong(1),
            "duracionMs": NumberLong(45000),
            "intentos": 1
        }
    ]);
    print("✅ Documentos de ejemplo insertados en 'processed_files': " + db.processed_files.countDocuments());
} catch (e) {
    print("❌ Error insertando documentos en 'processed_files': " + e);
}

// =============================================
// VERIFICACIÓN FINAL
// =============================================

print("\n========================================");
print("=== RESUMEN DE INICIALIZACIÓN ===");
print("========================================");
print("📊 Base de datos: " + db.getName());
print("👤 Usuario aplicación: " + process.env.MONGO_USER);
print("📦 Colecciones creadas: " + JSON.stringify(db.getCollectionNames()));
print("");
print("📁 Colección 'archivo_index':");
print("   🔍 Índices: " + db.archivo_index.getIndexes().length);
print("   📄 Documentos: " + db.archivo_index.countDocuments());
print("");
print("📁 Colección 'processed_files':");
print("   🔍 Índices: " + db.processed_files.getIndexes().length);
print("   📄 Documentos: " + db.processed_files.countDocuments());
print("");
print("✅ Inicialización completada exitosamente");
print("========================================");

// =============================================
// CONSULTAS DE VERIFICACIÓN
// =============================================

print("\n=== CONSULTAS DE VERIFICACIÓN ===");

// Verificar índices de archivo_index
print("\n🔍 Índices en 'archivo_index':");
db.archivo_index.getIndexes().forEach(function(index) {
    print("   - " + index.name + ": " + JSON.stringify(index.key));
});

// Verificar índices de processed_files
print("\n🔍 Índices en 'processed_files':");
db.processed_files.getIndexes().forEach(function(index) {
    print("   - " + index.name + ": " + JSON.stringify(index.key));
});

// Estadísticas de archivos procesados
print("\n📊 Estadísticas de procesamiento:");
var stats = db.processed_files.aggregate([
    {
        $group: {
            _id: "$status",
            count: { $sum: 1 }
        }
    }
]).toArray();
stats.forEach(function(stat) {
    print("   - " + stat._id + ": " + stat.count + " archivos");
});

print("\n✅ Script de inicialización finalizado");