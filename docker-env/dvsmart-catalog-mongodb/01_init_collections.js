// =============================================
// INICIALIZACIÓN DE LA BASE DE DATOS
// DVSmart Reorganization API - MongoDB Setup
// VERSION 2.0 - Con soporte para cleanup (borrado de origen)
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
                // ═════════════════════════════════════════════
                // IDENTIFICACIÓN
                // ═════════════════════════════════════════════
                idUnico: {
                  bsonType: "string",
                  description: "SHA-256 hash único (sourcePath + fileName + fileSize + lastModificationDate)"
                },
                
                // ═════════════════════════════════════════════
                // METADATA DEL ARCHIVO
                // ═════════════════════════════════════════════
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
                  description: "Tamaño en bytes (usado en idUnico)"
                },
                lastModificationDate: {
                  bsonType: "date",
                  description: "Fecha de última modificación (usado en idUnico)"
                },
                
                // ═════════════════════════════════════════════
                // CONTROL DE INDEXACIÓN
                // ═════════════════════════════════════════════
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
                
                // ═════════════════════════════════════════════
                // CONTROL DE REORGANIZACIÓN
                // ═════════════════════════════════════════════
                reorg_status: {
                  enum: ["PENDING", "COMPLETED", "FAILED", "SKIPPED"],
                  description: "Estado de la reorganización"
                },
                reorg_destinationPath: {
                  bsonType: ["string", "null"],
                  description: "Ruta en SFTP destino"
                },
                reorg_completedAt: {
                  bsonType: ["date", "null"],
                  description: "Fecha de reorganización exitosa (usado para validar cleanup)"
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
                },
                
                // ═════════════════════════════════════════════
                // CONTROL DE CLEANUP (BORRADO ORIGEN) - NUEVO
                // ═════════════════════════════════════════════
                deleted_from_source: {
                  bsonType: "bool",
                  description: "Indica si el archivo fue borrado del SFTP origen"
                },
                source_deletion_date: {
                  bsonType: ["date", "null"],
                  description: "Fecha en que se borró del origen"
                },
                deleted_by: {
                  bsonType: ["string", "null"],
                  description: "Identificador del proceso que borró (cleanup-step-pipelined)"
                },
                
                // ═════════════════════════════════════════════
                // METADATA DE NEGOCIO (OPCIONAL)
                // ═════════════════════════════════════════════
                business_tipoDocumento: {
                  bsonType: ["string", "null"],
                  description: "Tipo de documento extraído (FACTURA, CONTRATO, etc.)"
                },
                business_codigoCliente: {
                  bsonType: ["string", "null"],
                  description: "Código de cliente extraído"
                },
                business_anio: {
                  bsonType: ["int", "null"],
                  description: "Año del documento"
                },
                business_mes: {
                  bsonType: ["int", "null"],
                  description: "Mes del documento"
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
    // ═════════════════════════════════════════════
    // ÍNDICES PRINCIPALES
    // ═════════════════════════════════════════════
    
    // Índice único para idUnico (PK funcional)
    db.files_index.createIndex(
        { "idUnico": 1 }, 
        { unique: true, name: "idx_id_unico" }
    );
    
    // ═════════════════════════════════════════════
    // ÍNDICES PARA REORGANIZACIÓN
    // ═════════════════════════════════════════════
    
    // Índice para Reader del servicio de reorganización
    // Query: { reorg_status: "PENDING" }
    db.files_index.createIndex(
        { "reorg_status": 1, "_id": 1 }, 
        { 
            name: "idx_reorg_pending", 
            partialFilterExpression: { "reorg_status": "PENDING" } 
        }
    );
    
    // ⭐ NUEVO: Índice para Reader de Cleanup (Step 2)
    // Query: { reorg_status: "COMPLETED", deleted_from_source: false }
    db.files_index.createIndex(
        { "reorg_status": 1, "deleted_from_source": 1 }, 
        { 
            name: "idx_cleanup_candidates",
            partialFilterExpression: { 
                "reorg_status": "COMPLETED",
                "deleted_from_source": false 
            }
        }
    );
    
    // ═════════════════════════════════════════════
    // ÍNDICES DE BÚSQUEDA
    // ═════════════════════════════════════════════
    
    // Índice para búsquedas por sourcePath
    db.files_index.createIndex(
        { "sourcePath": 1 }, 
        { name: "idx_source_path" }
    );
    
    // Índice para búsquedas por extensión y tamaño
    db.files_index.createIndex(
        { "extension": 1, "fileSize": -1 }, 
        { name: "idx_extension_size" }
    );
    
    // ═════════════════════════════════════════════
    // ÍNDICES DE AUDITORÍA
    // ═════════════════════════════════════════════
    
    // Índice para auditoría de indexación
    db.files_index.createIndex(
        { "indexing_status": 1, "indexing_indexedAt": -1 }, 
        { name: "idx_indexing_status" }
    );
    
    // Índice para auditoría de reorganización
    db.files_index.createIndex(
        { "reorg_status": 1, "reorg_completedAt": -1 }, 
        { name: "idx_reorg_status" }
    );
    
    // ⭐ NUEVO: Índice para auditoría de cleanup
    db.files_index.createIndex(
        { "deleted_from_source": 1, "source_deletion_date": -1 }, 
        { name: "idx_cleanup_audit" }
    );
    
    // ═════════════════════════════════════════════
    // ÍNDICES DE NEGOCIO
    // ═════════════════════════════════════════════
    
    // Índice para metadata de negocio (sparse - solo si existe)
    db.files_index.createIndex(
        { "business_tipoDocumento": 1, "business_anio": -1 }, 
        { name: "idx_business_tipo_anio", sparse: true }
    );
    
    print("✅ Índices creados exitosamente en 'files_index'");
    print("   - Total índices: " + db.files_index.getIndexes().length);
} catch (e) {
    print("❌ Error creando índices en 'files_index': " + e);
}

// Inserción de documentos de ejemplo
try {
    db.files_index.insertMany([
        // ═════════════════════════════════════════════
        // Ejemplo 1: Archivo indexado, pendiente de reorganizar
        // ═════════════════════════════════════════════
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
            "reorg_completedAt": null,
            "reorg_jobExecutionId": null,
            "reorg_durationMs": null,
            "reorg_attempts": 0,
            "reorg_errorDescription": null,
            "reorg_lastAttemptAt": null,
            
            // ⭐ NUEVO: Campos de cleanup
            "deleted_from_source": false,
            "source_deletion_date": null,
            "deleted_by": null
        },
        
        // ═════════════════════════════════════════════
        // Ejemplo 2: Archivo reorganizado, pendiente de borrar
        // ═════════════════════════════════════════════
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

            "reorg_status": "COMPLETED",
            "reorg_destinationPath": "/organized/CONTRATO/2023/contrato_002.pdf",
            "reorg_completedAt": ISODate("2025-12-20T10:15:32.000Z"),
            "reorg_jobExecutionId": NumberLong(12345),
            "reorg_durationMs": NumberLong(1250),
            "reorg_attempts": 1,
            "reorg_errorDescription": null,
            "reorg_lastAttemptAt": ISODate("2025-12-20T10:15:32.000Z"),
            
            // ⭐ NUEVO: Pendiente de borrar (será procesado por Step 2)
            "deleted_from_source": false,
            "source_deletion_date": null,
            "deleted_by": null
        },
        
        // ═════════════════════════════════════════════
        // Ejemplo 3: Archivo completamente procesado (reorganizado Y borrado)
        // ═════════════════════════════════════════════
        {
            "idUnico": "c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456a1b2",
            "sourcePath": "/apps/legacy/2024/01/recibo_003.pdf",
            "fileName": "recibo_003.pdf",
            "extension": ".pdf",
            "fileSize": NumberLong(89234),
            "lastModificationDate": ISODate("2025-01-10T14:20:00.000Z"),

            "indexing_status": "COMPLETED",
            "indexing_indexedAt": ISODate("2025-12-19T15:22:00.000Z"),
            "indexing_errorDescription": null,

            "business_tipoDocumento": "RECIBO",
            "business_codigoCliente": "C-5678",
            "business_anio": 2024,
            "business_mes": 1,

            "reorg_status": "COMPLETED",
            "reorg_destinationPath": "/organized/RECIBO/2024/recibo_003.pdf",
            "reorg_completedAt": ISODate("2025-12-20T10:16:45.000Z"),
            "reorg_jobExecutionId": NumberLong(12345),
            "reorg_durationMs": NumberLong(980),
            "reorg_attempts": 1,
            "reorg_errorDescription": null,
            "reorg_lastAttemptAt": ISODate("2025-12-20T10:16:45.000Z"),
            
            // ⭐ NUEVO: Ya borrado del origen (ciclo completo)
            "deleted_from_source": true,
            "source_deletion_date": ISODate("2025-12-20T11:30:15.000Z"),
            "deleted_by": "cleanup-step-pipelined"
        },
        
        // ═════════════════════════════════════════════
        // Ejemplo 4: Archivo que falló en indexación (skip reorganización)
        // ═════════════════════════════════════════════
        {
            "idUnico": "d4e5f6789012345678901234567890abcdef1234567890abcdef123456a1b2c3",
            "sourcePath": "/apps/legacy/2023/corrupt_file.pdf",
            "fileName": "corrupt_file.pdf",
            "extension": ".pdf",
            "fileSize": NumberLong(0),
            "lastModificationDate": ISODate("2025-03-05T09:10:00.000Z"),

            "indexing_status": "FAILED",
            "indexing_indexedAt": ISODate("2025-12-19T15:23:00.000Z"),
            "indexing_errorDescription": "File is corrupted or empty",

            "business_tipoDocumento": null,
            "business_codigoCliente": null,
            "business_anio": null,
            "business_mes": null,

            "reorg_status": "SKIPPED",
            "reorg_destinationPath": null,
            "reorg_completedAt": null,
            "reorg_jobExecutionId": null,
            "reorg_durationMs": null,
            "reorg_attempts": 0,
            "reorg_errorDescription": "Skipped due to indexing failure",
            "reorg_lastAttemptAt": null,
            
            // ⭐ NUEVO: No aplica borrado (archivo corrupto)
            "deleted_from_source": false,
            "source_deletion_date": null,
            "deleted_by": null
        },
        
        // ═════════════════════════════════════════════
        // Ejemplo 5: Archivo que re-apareció después de ser borrado
        // ═════════════════════════════════════════════
        {
            "idUnico": "e5f6789012345678901234567890abcdef1234567890abcdef123456a1b2c3d4",
            "sourcePath": "/apps/legacy/2023/08/informe_004.pdf",
            "fileName": "informe_004.pdf",
            "extension": ".pdf",
            "fileSize": NumberLong(456123),
            "lastModificationDate": ISODate("2025-08-20T16:40:00.000Z"),

            "indexing_status": "COMPLETED",
            "indexing_indexedAt": ISODate("2025-12-26T10:00:00.000Z"),
            "indexing_errorDescription": null,

            "business_tipoDocumento": "INFORME",
            "business_codigoCliente": "C-7890",
            "business_anio": 2023,
            "business_mes": 8,

            "reorg_status": "PENDING",  // ⚠️ Re-procesado por re-aparición
            "reorg_destinationPath": null,
            "reorg_completedAt": null,
            "reorg_jobExecutionId": null,
            "reorg_durationMs": null,
            "reorg_attempts": 0,
            "reorg_errorDescription": null,
            "reorg_lastAttemptAt": null,
            
            // ⭐ NUEVO: Flag reseteado (archivo volvió a aparecer manualmente)
            "deleted_from_source": false,
            "source_deletion_date": null,
            "deleted_by": null
        }
    ]);
    print("✅ Documentos de ejemplo insertados en 'files_index': " + db.files_index.countDocuments());
} catch (e) {
    print("❌ Error insertando documentos en 'files_index': " + e);
}

// =============================================
// COLECCIÓN: job_executions_audit
// =============================================

if (!db.getCollectionNames().includes("job_executions_audit")) {
    try {
        db.createCollection("job_executions_audit", {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["auditId", "jobExecutionId", "serviceName", "jobName", "status"],
                    properties: {
                        // Identificación
                        auditId: {
                            bsonType: "string",
                            description: "ID único de auditoría (jobName-jobExecutionId-uuid)"
                        },
                        jobExecutionId: {
                            bsonType: "long",
                            description: "ID de ejecución de Spring Batch"
                        },
                        serviceName: {
                            bsonType: "string",
                            description: "Nombre del microservicio"
                        },
                        jobName: {
                            bsonType: "string",
                            description: "Nombre del job"
                        },
                        
                        // Tiempos
                        startTime: {
                            bsonType: ["date", "null"],
                            description: "Fecha/hora de inicio"
                        },
                        endTime: {
                            bsonType: ["date", "null"],
                            description: "Fecha/hora de fin"
                        },
                        durationMs: {
                            bsonType: ["long", "null"],
                            description: "Duración en milisegundos"
                        },
                        durationFormatted: {
                            bsonType: ["string", "null"],
                            description: "Duración en formato legible"
                        },
                        
                        // Estado
                        status: {
                            enum: ["STARTED", "COMPLETED", "FAILED", "STOPPED"],
                            description: "Estado de la ejecución"
                        },
                        exitCode: {
                            bsonType: ["string", "null"],
                            description: "Código de salida"
                        },
                        exitDescription: {
                            bsonType: ["string", "null"],
                            description: "Descripción del resultado"
                        },
                        
                        // Métricas de procesamiento
                        totalFilesIndexed: {
                            bsonType: ["long", "null"],
                            description: "Total de archivos indexados"
                        },
                        totalFilesProcessed: {
                            bsonType: ["long", "null"],
                            description: "Total de archivos procesados"
                        },
                        totalFilesSkipped: {
                            bsonType: ["long", "null"],
                            description: "Total de archivos saltados"
                        },
                        totalFilesFailed: {
                            bsonType: ["long", "null"],
                            description: "Total de archivos fallidos"
                        },
                        
                        // ⭐ NUEVO: Métricas de cleanup (Step 2)
                        totalFilesDeleted: {
                            bsonType: ["long", "null"],
                            description: "Total de archivos borrados del origen"
                        },
                        totalFilesDeletionFailed: {
                            bsonType: ["long", "null"],
                            description: "Total de archivos que fallaron al borrar"
                        },
                        
                        // Métricas de rendimiento
                        readCount: {
                            bsonType: ["long", "null"]
                        },
                        writeCount: {
                            bsonType: ["long", "null"]
                        },
                        commitCount: {
                            bsonType: ["long", "null"]
                        },
                        rollbackCount: {
                            bsonType: ["long", "null"]
                        },
                        filesPerSecond: {
                            bsonType: ["double", "null"],
                            description: "Throughput calculado"
                        },
                        
                        // ⭐ NUEVO: Desglose por steps
                        stepExecutions: {
                            bsonType: ["array", "null"],
                            description: "Resumen de cada step ejecutado",
                            items: {
                                bsonType: "object",
                                properties: {
                                    stepName: { bsonType: "string" },
                                    status: { bsonType: "string" },
                                    readCount: { bsonType: "int" },
                                    writeCount: { bsonType: "int" },
                                    skipCount: { bsonType: "int" },
                                    duration: { bsonType: "string" }
                                }
                            }
                        },
                        
                        // Información de errores
                        errorDescription: {
                            bsonType: ["string", "null"]
                        },
                        errorStackTrace: {
                            bsonType: ["string", "null"]
                        },
                        failureCount: {
                            bsonType: ["int", "null"]
                        },
                        
                        // Metadata
                        jobParameters: {
                            bsonType: ["object", "null"]
                        },
                        hostname: {
                            bsonType: ["string", "null"]
                        },
                        instanceId: {
                            bsonType: ["string", "null"]
                        },
                        
                        // Timestamps de auditoría
                        createdAt: {
                            bsonType: "date"
                        },
                        updatedAt: {
                            bsonType: "date"
                        }
                    }
                }
            }
        });
        print("✅ Colección 'job_executions_audit' creada con validación de esquema");
    } catch (e) {
        print("❌ Error creando colección 'job_executions_audit': " + e);
    }
} else {
    print("ℹ️  Colección 'job_executions_audit' ya existe");
}

// Índices para job_executions_audit
try {
    // Índice único para auditId
    db.job_executions_audit.createIndex(
        { "auditId": 1 }, 
        { unique: true, name: "idx_audit_id" }
    );
    
    // Índice único para jobExecutionId
    db.job_executions_audit.createIndex(
        { "jobExecutionId": 1 }, 
        { unique: true, name: "idx_job_execution_id" }
    );
    
    // Índice compuesto: jobName + status + startTime
    db.job_executions_audit.createIndex(
        { "jobName": 1, "status": 1, "startTime": -1 }, 
        { name: "idx_job_status_date" }
    );
    
    // Índice compuesto: serviceName + startTime
    db.job_executions_audit.createIndex(
        { "serviceName": 1, "startTime": -1 }, 
        { name: "idx_service_date" }
    );
    
    // Índice compuesto: status + startTime
    db.job_executions_audit.createIndex(
        { "status": 1, "startTime": -1 }, 
        { name: "idx_status_date" }
    );
    
    // Índice en createdAt
    db.job_executions_audit.createIndex(
        { "createdAt": -1 }, 
        { name: "idx_created_at" }
    );
    
    print("✅ Índices creados exitosamente en 'job_executions_audit'");
} catch (e) {
    print("❌ Error creando índices en 'job_executions_audit': " + e);
}

// Inserción de documentos de ejemplo en job_executions_audit
try {
    db.job_executions_audit.insertMany([
        // Ejemplo 1: Job de reorganización con cleanup completado
        {
            "auditId": "BATCH-REORGANIZATION-WITH-CLEANUP-12345-a1b2c3d4",
            "jobExecutionId": NumberLong(12345),
            "serviceName": "dvsmart-reorganization-api",
            "jobName": "BATCH-REORGANIZATION-WITH-CLEANUP",
            
            "startTime": ISODate("2025-12-20T10:00:00.000Z"),
            "endTime": ISODate("2025-12-20T11:45:30.000Z"),
            "durationMs": NumberLong(6330000),
            "durationFormatted": "1h 45m 30s",
            
            "status": "COMPLETED",
            "exitCode": "COMPLETED",
            "exitDescription": null,
            
            "totalFilesIndexed": NumberLong(11000000),
            "totalFilesProcessed": NumberLong(11000000),
            "totalFilesSkipped": NumberLong(0),
            "totalFilesFailed": NumberLong(0),
            
            // ⭐ NUEVO: Métricas de cleanup
            "totalFilesDeleted": NumberLong(10950000),
            "totalFilesDeletionFailed": NumberLong(50000),
            
            "readCount": NumberLong(11000000),
            "writeCount": NumberLong(11000000),
            "commitCount": NumberLong(110000),
            "rollbackCount": NumberLong(0),
            "filesPerSecond": 1738.10,
            
            // ⭐ NUEVO: Desglose por steps
            "stepExecutions": [
                {
                    "stepName": "reorganization-step",
                    "status": "COMPLETED",
                    "readCount": 11000000,
                    "writeCount": 11000000,
                    "skipCount": 0,
                    "duration": "1h 0m 0s"
                },
                {
                    "stepName": "cleanup-origin-step",
                    "status": "COMPLETED",
                    "readCount": 11000000,
                    "writeCount": 10950000,
                    "skipCount": 50000,
                    "duration": "45m 30s"
                }
            ],
            
            "errorDescription": null,
            "errorStackTrace": null,
            "failureCount": null,
            
            "jobParameters": {
                "timestamp": "2025-12-20T10:00:00"
            },
            
            "hostname": "reorganization-api-pod-abc123",
            "instanceId": "reorganization-api-pod-abc123",
            
            "createdAt": ISODate("2025-12-20T10:00:00.000Z"),
            "updatedAt": ISODate("2025-12-20T11:45:30.000Z")
        },
        
        // Ejemplo 2: Job de indexación completado
        {
            "auditId": "BATCH-INDEX-FULL-12346-b2c3d4e5",
            "jobExecutionId": NumberLong(12346),
            "serviceName": "dvsmart-indexing-api",
            "jobName": "BATCH-INDEX-FULL",
            
            "startTime": ISODate("2025-12-24T14:00:00.000Z"),
            "endTime": ISODate("2025-12-24T14:30:00.000Z"),
            "durationMs": NumberLong(1800000),
            "durationFormatted": "30m 0s",
            
            "status": "COMPLETED",
            "exitCode": "COMPLETED",
            "exitDescription": null,
            
            "totalFilesIndexed": NumberLong(11000000),
            "totalFilesProcessed": NumberLong(11050000),
            "totalFilesSkipped": NumberLong(50000),
            "totalFilesFailed": NumberLong(0),
            
            // Sin métricas de cleanup (no aplica para indexación)
            "totalFilesDeleted": null,
            "totalFilesDeletionFailed": null,
            
            "readCount": NumberLong(11050000),
            "writeCount": NumberLong(11000000),
            "commitCount": NumberLong(110500),
            "rollbackCount": NumberLong(0),
            "filesPerSecond": 6111.11,
            
            "stepExecutions": null,
            
            "errorDescription": null,
            "errorStackTrace": null,
            "failureCount": null,
            
            "jobParameters": {
                "timestamp": "2025-12-24T14:00:00"
            },
            
            "hostname": "indexing-api-pod-xyz789",
            "instanceId": "indexing-api-pod-xyz789",
            
            "createdAt": ISODate("2025-12-24T14:00:00.000Z"),
            "updatedAt": ISODate("2025-12-24T14:30:00.000Z")
        }
    ]);
    print("✅ Documentos de ejemplo insertados en 'job_executions_audit': " + db.job_executions_audit.countDocuments());
} catch (e) {
    print("❌ Error insertando documentos en 'job_executions_audit': " + e);
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
print("📁 Colección 'job_executions_audit':");
print("   🔍 Índices: " + db.job_executions_audit.getIndexes().length);
print("   📄 Documentos: " + db.job_executions_audit.countDocuments());
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

// Verificar índices de job_executions_audit
print("\n🔍 Índices en 'job_executions_audit':");
db.job_executions_audit.getIndexes().forEach(function(index) {
    print("   - " + index.name + ": " + JSON.stringify(index.key));
});

// Estadísticas de archivos por estado
print("\n📊 Estadísticas de archivos por estado:");
var reorgStats = db.files_index.aggregate([
    {
        $group: {
            _id: {
                reorg_status: "$reorg_status",
                deleted_from_source: "$deleted_from_source"
            },
            count: { $sum: 1 }
        }
    },
    {
        $sort: { "_id.reorg_status": 1 }
    }
]).toArray();
reorgStats.forEach(function(stat) {
    print("   - reorg_status: " + stat._id.reorg_status + 
          ", deleted: " + stat._id.deleted_from_source + 
          " → " + stat.count + " archivos");
});

// ⭐ NUEVO: Consulta de candidatos para cleanup
print("\n🗑️ Candidatos para cleanup (Step 2):");
var cleanupCandidates = db.files_index.countDocuments({
    reorg_status: "COMPLETED",
    deleted_from_source: false
});
print("   Total: " + cleanupCandidates + " archivos pendientes de borrar");

// Estadísticas de jobs de auditoría
print("\n📊 Estadísticas de jobs ejecutados:");
var jobStats = db.job_executions_audit.aggregate([
    {
        $group: {
            _id: { jobName: "$jobName", status: "$status" },
            count: { $sum: 1 }
        }
    },
    {
        $sort: { "_id.jobName": 1 }
    }
]).toArray();
jobStats.forEach(function(stat) {
    print("   - " + stat._id.jobName + " (" + stat._id.status + "): " + stat.count);
});

print("\n✅ Script de inicialización finalizado");
print("========================================");
print("⭐ NUEVAS CARACTERÍSTICAS v2.0:");
print("   - Campos de cleanup: deleted_from_source, source_deletion_date, deleted_by");
print("   - Índice idx_cleanup_candidates para Step 2");
print("   - Métricas de cleanup en auditoría");
print("   - Desglose por steps en auditoría");
print("   - idUnico mejorado (incluye fileSize + lastModificationDate)");
print("========================================");