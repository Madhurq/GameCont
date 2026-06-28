# ═══════════════════════════════════════════════════════════════
# GameCont Platform API — Production Dockerfile
# ═══════════════════════════════════════════════════════════════
# Multi-stage: Maven build → lightweight JRE runtime.
#
# ⚠️ t3.micro: JVM -Xmx384m to leave room for K3s + game servers.

FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S gamecont && adduser -S gamecont -G gamecont
COPY --from=build /app/target/*.jar app.jar
USER gamecont

EXPOSE 8080

ENV JAVA_OPTS="-Xms128m -Xmx384m -XX:+UseG1GC -XX:MaxGCPauseMillis=100 -XX:+UseStringDeduplication"

# ponytail: exec so Java replaces shell as PID 1 and receives SIGTERM
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
