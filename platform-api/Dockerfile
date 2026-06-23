# ═══════════════════════════════════════════════════════════════
# GameCont Platform API — Production Dockerfile
# ═══════════════════════════════════════════════════════════════
# Multi-stage build: Maven build → lightweight JRE runtime image.
# Final image is ~200 MB (Eclipse Temurin JRE 21 on Alpine).
#
# ⚠️ AWS Free Tier note: This runs on a t3.micro with 1 GB RAM.
#    JVM is configured with -Xmx384m to leave room for K3s + game servers.

# ── Stage 1: Build ──────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Cache dependencies first (only re-downloads if pom.xml changes)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Build the application
COPY src ./src
RUN mvn clean package -DskipTests -B

# ── Stage 2: Runtime ────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Security: run as non-root user
RUN addgroup -S gamecont && adduser -S gamecont -G gamecont
USER gamecont

# Copy the built JAR
COPY --from=build /app/target/*.jar app.jar

# Expose API port
EXPOSE 8080

# JVM tuning for t3.micro (1 GB RAM shared with K3s + game servers)
ENV JAVA_OPTS="-Xms128m -Xmx384m -XX:+UseG1GC -XX:MaxGCPauseMillis=100 -XX:+UseStringDeduplication"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
