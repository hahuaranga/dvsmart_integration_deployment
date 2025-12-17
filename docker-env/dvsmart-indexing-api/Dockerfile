# Usamos una imagen Alpine ligera con Java 21
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copia el JAR y configuración externa
COPY deployments/*.jar app.jar
COPY properties/* /opt/dvsmart/cfg/

# =============================================
# Variables de Entorno con BINDING AUTOMÁTICO (Spring Boot)
# Prefijo SERVER_TOMCAT_* para propiedades del servidor embebido
# =============================================
ENV SERVER_TOMCAT_MAX_THREADS=400
ENV SERVER_TOMCAT_MAX_CONNECTIONS=1000
ENV SERVER_TOMCAT_ACCEPT_COUNT=50
ENV SERVER_TOMCAT_KEEP_ALIVE_TIMEOUT=30000

# =============================================
# Variables Custom (requieren referencia en application.properties)
# =============================================
ENV SPRING_CONFIG_LOCATION="classpath:/application.properties,file:/opt/dvsmart/cfg/application.properties"

# Configuracion JVM (1GB heap)
ENV JAVA_OPTS="-Xmx1g -Djavax.xml.xpath.XPathFactory:http://java.sun.com/jaxp/xpath/dom=net.sf.saxon.xpath.XPathFactoryImpl"

# Puerto expuesto (puede ser sobrescrito con SERVER_PORT)
EXPOSE 8080

# Ejecución con variables de entorno
ENTRYPOINT ["sh", "-c", "java ${JAVA_OPTS} -jar app.jar"]
