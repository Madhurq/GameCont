package com.gamecont.platform.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Type-safe configuration properties for GameCont.
 * Maps to the `gamecont` prefix in application.yml.
 */
@Configuration
@ConfigurationProperties(prefix = "gamecont")
@Getter @Setter
public class GameContProperties {

    private Jwt jwt = new Jwt();
    private Kubernetes kubernetes = new Kubernetes();
    private ServerDefaults serverDefaults = new ServerDefaults();
    private Prometheus prometheus = new Prometheus();

    @Getter @Setter
    public static class Jwt {
        private String secret;
        private long expirationMs = 86400000; // 24 hours
    }

    @Getter @Setter
    public static class Kubernetes {
        private String namespace = "gamecont-servers";
        private String platformNamespace = "gamecont-platform";
    }

    @Getter @Setter
    public static class ServerDefaults {
        private String cpuRequest = "250m";
        private String cpuLimit = "500m";
        private String memoryRequest = "256Mi";
        private String memoryLimit = "512Mi";
        private int storageGb = 2;
        private int idleTimeoutMinutes = 10;
        private int maxServersPerUser = 3;
    }

    @Getter @Setter
    public static class Prometheus {
        private String url = "http://localhost:9090";
    }
}
