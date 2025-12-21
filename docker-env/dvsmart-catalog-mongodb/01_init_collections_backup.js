// =============================================
// INICIALIZACIÓN DE LA BASE DE DATOS
// DVSmart Reorganization API - MongoDB Setup
// =============================================

// 1. Autenticación como administrador
try {
    db.getSiblingDB('admin').auth(
        process.env.MONGO_INITDB_ROOT_USERNAME, 
        process.env.MONGO_INITDB_ROOT_PASSWORD
    );
    print("✅ Autenticación como root exitosa");
} catch (e) {
    print("❌ Error en autenticación root: " + e);
    quit(1);
}

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

// Variables para facilitar el acceso a las colecciones
var disorganizedFiles = db["disorganized-files-index"];
var organizedFiles = db["organized-files-index"];

// =============================================
// COLECCIÓN: disorganized-files-index
// =============================================

if (!db.getCollectionNames().includes("disorganized-files-index")) {
    try {
        db.createCollection("disorganized-files-index", {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["idUnico", "rutaOrigen", "nombre", "mtime"],
                    properties: {
                        idUnico: {
                            bsonType: "string",
                            description: "Identificador único del archivo - requerido"
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
                            description: "Extensión del archivo - opcional"
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
        print("✅ Colección 'disorganized-files-index' creada con validación de esquema");
    } catch (e) {
        print("❌ Error creando colección 'disorganized-files-index': " + e);
    }
} else {
    print("ℹ️  Colección 'disorganized-files-index' ya existe");
}

// Índices para disorganized-files-index - CORREGIDO
try {
    disorganizedFiles.createIndex({ "idUnico": 1 }, { unique: true, name: "idx_idUnico_unique" });
    disorganizedFiles.createIndex({ "rutaOrigen": 1 }, { name: "idx_rutaOrigen" });
    disorganizedFiles.createIndex({ "nombre": 1 }, { name: "idx_nombre" });
    disorganizedFiles.createIndex({ "mtime": -1 }, { name: "idx_mtime_desc" });
    disorganizedFiles.createIndex({ "indexadoEn": -1, "mtime": -1 }, { name: "idx_indexado_mtime" });
    print("✅ Índices creados exitosamente en 'disorganized-files-index'");
} catch (e) {
    print("❌ Error creando índices en 'disorganized-files-index': " + e);
}

// Inserción de documentos de ejemplo - CORREGIDO
try {
    disorganizedFiles.insertMany([
        {
            "idUnico": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
            "rutaOrigen": "/home/testuser/upload/origin/dir1/documento1.pdf",
            "nombre": "documento1.pdf",
            "mtime": new Date("2025-12-10T10:30:00.000Z"),
            "tamanio": NumberLong("1048576"),
            "extension": ".pdf",
            "indexadoEn": new Date()
        },
        {
            "idUnico": "b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567",
            "rutaOrigen": "/home/testuser/upload/origin/dir1/imagen1.jpg",
            "nombre": "imagen1.jpg",
            "mtime": new Date("2025-12-11T14:45:00.000Z"),
            "tamanio": NumberLong("524288"),
            "extension": ".jpg",
            "indexadoEn": new Date()
        },
        {
            "idUnico": "c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678",
            "rutaOrigen": "/home/testuser/upload/origin/dir2/reporte.xlsx",
            "nombre": "reporte.xlsx",
            "mtime": new Date("2025-12-12T09:15:00.000Z"),
            "tamanio": NumberLong("2097152"),
            "extension": ".xlsx",
            "indexadoEn": new Date()
        },
        {
            "idUnico": "d4e5f6789012345678901234567890abcdef1234567890abcdef123456789",
            "rutaOrigen": "/home/testuser/upload/origin/dir3/video.mp4",
            "nombre": "video.mp4",
            "mtime": new Date("2025-12-13T16:20:00.000Z"),
            "tamanio": NumberLong("104857600"),
            "extension": ".mp4",
            "indexadoEn": new Date()
        },
        {
            "idUnico": "e5f6789012345678901234567890abcdef1234567890abcdef1234567890a",
            "rutaOrigen": "/home/testuser/upload/origin/notas.txt",
            "nombre": "notas.txt",
            "mtime": new Date("2025-12-13T18:00:00.000Z"),
            "tamanio": NumberLong("4096"),
            "extension": ".txt",
            "indexadoEn": new Date()
        }
    ]);
    print("✅ Documentos de ejemplo insertados en 'disorganized-files-index': " + disorganizedFiles.countDocuments());
} catch (e) {
    print("❌ Error insertando documentos en 'disorganized-files-index': " + e);
}

// =============================================
// COLECCIÓN: organized-files-index - ESQUEMA CORREGIDO
// =============================================

if (!db.getCollectionNames().includes("organized-files-index")) {
    try {
        db.createCollection("organized-files-index", {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["idUnico", "rutaOrigen", "rutaDestino", "nombre", "status", "processedAt"],
                    properties: {
                        idUnico: {
                            bsonType: "string",
                            description: "Identificador único del archivo - requerido"
                        },
                        rutaOrigen: {
                            bsonType: "string",
                            minLength: 1,
                            description: "Path original en SFTP origen - requerido"
                        },
                        rutaDestino: {
                            bsonType: "string",
                            minLength: 1,
                            description: "Path calculado en SFTP destino - requerido"
                        },
                        nombre: {
                            bsonType: "string",
                            minLength: 1,
                            description: "Nombre del archivo procesado - requerido"
                        },
                        status: {
                            bsonType: "string",
                            enum: ["SUCCESS", "FAILED"],
                            description: "Estado del procesamiento - requerido"
                        },
                        processedAt: {
                            bsonType: "date",
                            description: "Timestamp de cuando se procesó el archivo - requerido"
                        },
                        errorMessage: {
                            bsonType: ["string", "null"],
                            description: "Mensaje de error (solo si status=FAILED)"
                        },
                        jobExecutionId: {
                            bsonType: "long",
                            description: "ID de la ejecución del job batch"
                        },
                        duracionMs: {
                            bsonType: "long",
                            minimum: 0,
                            description: "Duración del procesamiento en milisegundos"
                        },
                        intentos: {
                            bsonType: "int",
                            minimum: 1,
                            description: "Número de intentos de procesamiento"
                        }
                    }
                }
            },
            validationLevel: "strict",
            validationAction: "error"
        });
        print("✅ Colección 'organized-files-index' creada con validación de esquema");
    } catch (e) {
        print("❌ Error creando colección 'organized-files-index': " + e);
    }
} else {
    print("ℹ️  Colección 'organized-files-index' ya existe");
}

// Índices para organized-files-index - CORREGIDO
try {
    organizedFiles.createIndex({ "idUnico": 1 }, { unique: true, name: "idx_idUnico_unique" });
    organizedFiles.createIndex({ "status": 1, "processedAt": -1 }, { name: "idx_status_processedAt" });
    organizedFiles.createIndex({ "processedAt": -1 }, { name: "idx_processedAt_desc" });
    organizedFiles.createIndex({ "jobExecutionId": 1 }, { name: "idx_jobExecutionId" });
    organizedFiles.createIndex({ "rutaDestino": 1 }, { name: "idx_rutaDestino" });
    print("✅ Índices creados exitosamente en 'organized-files-index'");
} catch (e) {
    print("❌ Error creando índices en 'organized-files-index': " + e);
}

// Inserción de documentos de ejemplo - VERSIÓN CORREGIDA
try {
    var idsExistentes = disorganizedFiles.distinct("idUnico");
    print("📋 IDs disponibles en disorganized-files-index: " + idsExistentes.length);
    
    var documentosAInsertar = [
        {
            "idUnico": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
            "rutaOrigen": "/home/testuser/upload/origin/dir1/documento1.pdf",
            "rutaDestino": "/home/testuser/upload/destination/a1/b2/c3/documento1.pdf",
            "nombre": "documento1.pdf",
            "status": "SUCCESS",
            "processedAt": new Date("2025-12-13T22:35:10.123Z"),
            // NO incluir errorMessage cuando es null
            "jobExecutionId": NumberLong("1"),
            "duracionMs": NumberLong("1234"),
            "intentos": 1
        },
        {
            "idUnico": "b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567",
            "rutaOrigen": "/home/testuser/upload/origin/dir1/imagen1.jpg",
            "rutaDestino": "/home/testuser/upload/destination/b2/c3/d4/imagen1.jpg",
            "nombre": "imagen1.jpg",
            "status": "SUCCESS",
            "processedAt": new Date("2025-12-13T22:35:15.456Z"),
            // NO incluir errorMessage cuando es null
            "jobExecutionId": NumberLong("1"),
            "duracionMs": NumberLong("890"),
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
            "jobExecutionId": NumberLong("1"),
            "duracionMs": NumberLong("30000"),
            "intentos": 3
        },
        {
            "idUnico": "d4e5f6789012345678901234567890abcdef1234567890abcdef123456789",
            "rutaOrigen": "/home/testuser/upload/origin/dir3/video.mp4",
            "rutaDestino": "/home/testuser/upload/destination/d4/e5/f6/video.mp4",
            "nombre": "video.mp4",
            "status": "SUCCESS",
            "processedAt": new Date("2025-12-13T22:36:45.123Z"),
            // NO incluir errorMessage cuando es null
            "jobExecutionId": NumberLong("1"),
            "duracionMs": NumberLong("45000"),
            "intentos": 1
        }
    ];
    
    var documentosValidos = documentosAInsertar.filter(function(doc) {
        return idsExistentes.includes(doc.idUnico);
    });
    
    if (documentosValidos.length > 0) {
        var resultado = organizedFiles.insertMany(documentosValidos);
        print("✅ Documentos insertados en 'organized-files-index': " + resultado.insertedCount);
    } else {
        print("⚠️  No se insertaron documentos - IDs no coinciden con disorganized-files-index");
    }
    
} catch (e) {
    print("❌ Error insertando documentos en 'organized-files-index': " + e);
}

// =============================================
// VERIFICACIÓN FINAL
// =============================================

print("\n========================================");
print("=== RESUMEN DE INICIALIZACIÓN ===");
print("========================================");
print("📊 Base de datos: " + db.getName());
print("👤 Usuario aplicación: " + process.env.MONGO_USER);
print("📦 Colecciones: " + JSON.stringify(db.getCollectionNames()));
print("");
print("📁 Colección 'disorganized-files-index':");
print("   🔍 Índices: " + disorganizedFiles.getIndexes().length);
print("   📄 Documentos: " + disorganizedFiles.countDocuments());
print("");
print("📁 Colección 'organized-files-index':");
print("   🔍 Índices: " + organizedFiles.getIndexes().length);
print("   📄 Documentos: " + organizedFiles.countDocuments());
print("");
print("✅ Inicialización completada exitosamente");
print("========================================");

// =============================================
// CONSULTAS DE VERIFICACIÓN
// =============================================

print("\n=== CONSULTAS DE VERIFICACIÓN ===");

// Verificar índices de disorganized-files-index
print("\n🔍 Índices en 'disorganized-files-index':");
disorganizedFiles.getIndexes().forEach(function(index) {
    print("   - " + index.name + ": " + JSON.stringify(index.key));
});

// Verificar índices de organized-files-index
print("\n🔍 Índices en 'organized-files-index':");
organizedFiles.getIndexes().forEach(function(index) {
    print("   - " + index.name + ": " + JSON.stringify(index.key));
});

// Estadísticas de archivos procesados
print("\n📊 Estadísticas de procesamiento:");
var stats = organizedFiles.aggregate([
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