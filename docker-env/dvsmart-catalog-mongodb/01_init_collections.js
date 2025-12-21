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

// =============================================
// COLECCIÓN: files_index
// =============================================

if (!db.getCollectionNames().includes("files_index")) {
    try {
		db.createCollection("files_index", {
		  validator: {
		    $jsonSchema: {
		      bsonType: "object",
		      required: ["idUnico", "sourcePath", "fileName", "indexing_status", "reorg_status"],
		      properties: {
		        // Identificación
		        idUnico: {
		          bsonType: "string",
		          description: "SHA-256 hash único del archivo"
		        },
		        
		        // Metadata del archivo
		        sourcePath: {
		          bsonType: "string",
		          description: "Ruta completa en SFTP origen"
		        },
		        fileName: {
		          bsonType: "string",
		          description: "Nombre del archivo"
		        },
		        extension: {
		          bsonType: "string",
		          description: "Extensión (.pdf, .docx, etc.)"
		        },
		        fileSize: {
		          bsonType: "long",
		          description: "Tamaño en bytes"
		        },
		        lastModificationDate: {
		          bsonType: "date",
		          description: "Fecha de última modificación del archivo"
		        },
		        
		        // Control de indexación
		        indexing_status: {
		          enum: ["PENDING", "COMPLETED", "FAILED"],
		          description: "Estado de la fase de indexación"
		        },
		        indexing_indexedAt: {
		          bsonType: ["date", "null"],
		          description: "Fecha de indexación"
		        },
		        indexing_errorDescription: {
		          bsonType: ["string", "null"],
		          description: "Descripción del error en indexación"
		        },
		        
		        // Control de reorganización
		        reorg_status: {
		          enum: ["PENDING", "PROCESSING", "SUCCESS", "FAILED", "SKIPPED"],
		          description: "Estado de la reorganización"
		        },
		        reorg_destinationPath: {
		          bsonType: ["string", "null"],
		          description: "Ruta en SFTP destino"
		        },
		        reorg_reorganizedAt: {
		          bsonType: ["date", "null"],
		          description: "Fecha de reorganización exitosa"
		        },
		        reorg_jobExecutionId: {
		          bsonType: ["long", "null"],
		          description: "ID del job de Spring Batch"
		        },
		        reorg_durationMs: {
		          bsonType: ["long", "null"],
		          description: "Duración de la transferencia en ms"
		        },
		        reorg_attempts: {
		          bsonType: "int",
		          description: "Número de intentos de reorganización"
		        },
		        reorg_errorDescription: {
		          bsonType: ["string", "null"],
		          description: "Descripción del error en reorganización"
		        },
		        reorg_lastAttemptAt: {
		          bsonType: ["date", "null"],
		          description: "Fecha del último intento"
		        }
		      }
		    }
		  },
		  validationLevel: "moderate",  // Permite updates parciales
		  validationAction: "error"      // Rechaza documentos inválidos
		})
        print("✅ Colección 'files_index' creada con validación de esquema");
    } catch (e) {
        print("❌ Error creando colección 'files_index': " + e);
    }
} else {
    print("ℹ️  Colección 'files_index' ya existe");
}

// Índices para files_index
try {
	// Índice único para idUnico (PK funcional)
	db.files_index.createIndex({ "idUnico": 1 }, { unique: true, name: "idx_id_unico" })
	// Índice para Reader del servicio de reorganización
	// Query: { reorg_status: "PENDING" }
	db.files_index.createIndex({ "reorg_status": 1, "_id": 1 }, { name: "idx_reorg_pending", partialFilterExpression: { "reorg_status": "PENDING" } })
	// Índice para búsquedas por sourcePath
	db.files_index.createIndex({ "sourcePath": 1 }, { name: "idx_source_path" })
	// Índice para búsquedas por extensión y tamaño
	db.files_index.createIndex({ "extension": 1, "fileSize": -1 }, { name: "idx_extension_size" })
	// Índice para auditoría de indexación
	db.files_index.createIndex({ "indexing_status": 1, "indexing_indexedAt": -1 }, { name: "idx_indexing_status" })
	// Índice para auditoría de reorganización
	db.files_index.createIndex({ "reorg_status": 1, "reorg_reorganizedAt": -1 }, { name: "idx_reorg_status" })
	// Índice para metadata de negocio (ejemplo)
	db.files_index.createIndex({ "business_tipoDocumento": 1, "business_anio": -1 }, { name: "idx_business_tipo_anio", sparse: true })	
    print("✅ Índices creados exitosamente en 'files_index'");
} catch (e) {
    print("❌ Error creando índices en 'files_index': " + e);
}

// Inserción de documentos de ejemplo
try {
    db.files_index.insertMany([
		// Ejemplo 1: Archivo indexado, pendiente de reorganizar
        {
			"idUnico": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
			"sourcePath": "/apps/legacy/2023/10/factura_001.pdf",
			"fileName": "factura_001.pdf",
			"extension": ".pdf",
			"fileSize": NumberLong(102456),
			"lastModificationDate": ISODate("2025-12-10T10:30:00.000Z"),

			"indexing_status": "COMPLETED",
			"indexing_indexedAt": ISODate("2025-12-19T15:20:00.000Z"),
			"indexing_errorDescription": null,

			"business_tipoDocumento": "FACTURA",
			"business_codigoCliente": "C-9982",
			"business_anio": 2023,
			"business_mes": 10,

			"reorg_status": "PENDING",
			"reorg_destinationPath": null,
			"reorg_reorganizedAt": null,
			"reorg_jobExecutionId": null,
			"reorg_durationMs": null,
			"reorg_attempts": 0,
			"reorg_errorDescription": null,
			"reorg_lastAttemptAt": null			
        },
		// Ejemplo 2: Archivo reorganizado exitosamente
        {
			"idUnico": "b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456a1",
			"sourcePath": "/apps/legacy/2023/11/contrato_002.pdf",
			"fileName": "contrato_002.pdf",
			"extension": ".pdf",
			"fileSize": NumberLong(256789),
			"lastModificationDate": ISODate("2025-11-15T08:45:00.000Z"),

			"indexing_status": "COMPLETED",
			"indexing_indexedAt": ISODate("2025-12-19T15:21:00.000Z"),
			"indexing_errorDescription": null,

			"business_tipoDocumento": "CONTRATO",
			"business_codigoCliente": "C-1234",
			"business_anio": 2023,
			"business_mes": 11,

			"reorg_status": "SUCCESS",
			"reorg_destinationPath": "/organized/b2/c3/d4/contrato_002.pdf",
			"reorg_reorganizedAt": ISODate("2025-12-20T10:15:32.000Z"),
			"reorg_jobExecutionId": NumberLong(12345),
			"reorg_durationMs": NumberLong(1250),
			"reorg_attempts": 1,
			"reorg_errorDescription": null,
			"reorg_lastAttemptAt": ISODate("2025-12-20T10:15:32.000Z")
        },
		// Ejemplo 3: Archivo con fallo en reorganización
        {
			"idUnico": "c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456a1b2",
			"sourcePath": "/apps/legacy/2023/12/reporte_003.xlsx",
			"fileName": "reporte_003.xlsx",
			"extension": ".xlsx",
			"fileSize": NumberLong(512000),
			"lastModificationDate": ISODate("2025-12-01T14:20:00.000Z"),

			"indexing_status": "COMPLETED",
			"indexing_indexedAt": ISODate("2025-12-19T15:22:00.000Z"),
			"indexing_errorDescription": null,

			"business_tipoDocumento": "REPORTE",
			"business_anio": 2023,
			"business_mes": 12,

			"reorg_status": "FAILED",
			"reorg_destinationPath": "/organized/c3/d4/e5/reporte_003.xlsx",
			"reorg_reorganizedAt": null,
			"reorg_jobExecutionId": NumberLong(12345),
			"reorg_durationMs": null,
			"reorg_attempts": 3,
			"reorg_errorDescription": "SocketTimeoutException: Read timed out",
			"reorg_lastAttemptAt": ISODate("2025-12-20T10:18:45.000Z")
        },
		// Ejemplo 4: Archivo en procesamiento
        {
			"idUnico": "d4e5f6789012345678901234567890abcdef1234567890abcdef123456a1b2c3",
			"sourcePath": "/apps/legacy/2024/01/imagen_004.jpg",
			"fileName": "imagen_004.jpg",
			"extension": ".jpg",
			"fileSize": NumberLong(2048000),
			"lastModificationDate": ISODate("2024-01-05T09:30:00.000Z"),

			"indexing_status": "COMPLETED",
			"indexing_indexedAt": ISODate("2025-12-19T15:23:00.000Z"),
			"indexing_errorDescription": null,

			"reorg_status": "PROCESSING",
			"reorg_destinationPath": "/organized/d4/e5/f6/imagen_004.jpg",
			"reorg_reorganizedAt": null,
			"reorg_jobExecutionId": NumberLong(12346),
			"reorg_durationMs": null,
			"reorg_attempts": 1,
			"reorg_errorDescription": null,
			"reorg_lastAttemptAt": ISODate("2025-12-20T11:05:10.000Z")
        },
		// Ejemplo 5: Archivo omitido (SKIPPED)
        {
			"idUnico": "e5f6789012345678901234567890abcdef1234567890abcdef123456a1b2c3d4",
			"sourcePath": "/apps/legacy/temp/archivo_temp.tmp",
			"fileName": "archivo_temp.tmp",
			"extension": ".tmp",
			"fileSize": NumberLong(1024),
			"lastModificationDate": ISODate("2025-12-20T08:00:00.000Z"),

			"indexing_status": "COMPLETED",
			"indexing_indexedAt": ISODate("2025-12-20T08:05:00.000Z"),
			"indexing_errorDescription": null,

			"reorg_status": "SKIPPED",
			"reorg_destinationPath": null,
			"reorg_reorganizedAt": null,
			"reorg_jobExecutionId": null,
			"reorg_durationMs": null,
			"reorg_attempts": 0,
			"reorg_errorDescription": "Archivo temporal, excluido de reorganización",
			"reorg_lastAttemptAt": null
        }
    ]);
    print("✅ Documentos de ejemplo insertados en 'files_index': " + db.files_index.countDocuments());
} catch (e) {
    print("❌ Error insertando documentos en 'files_index': " + e);
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
print("📁 Colección 'files_index':");
print("   🔍 Índices: " + db.files_index.getIndexes().length);
print("   📄 Documentos: " + db.files_index.countDocuments());
print("");
print("✅ Inicialización completada exitosamente");
print("========================================");

// =============================================
// CONSULTAS DE VERIFICACIÓN
// =============================================

print("\n=== CONSULTAS DE VERIFICACIÓN ===");

// Verificar índices de files_index
print("\n🔍 Índices en 'files_index':");
db.files_index.getIndexes().forEach(function(index) {
    print("   - " + index.name + ": " + JSON.stringify(index.key));
});

// Estadísticas de archivos procesados
print("\n📊 Estadísticas de procesamiento:");
var stats = db.files_index.aggregate([
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