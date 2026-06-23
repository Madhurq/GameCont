package com.gamecont.platform.config;

import io.fabric8.kubernetes.client.Config;
import io.fabric8.kubernetes.client.ConfigBuilder;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.KubernetesClientBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Kubernetes client configuration.
 *
 * Auto-detects the environment:
 * - In-cluster (K3s pod): Uses service account token at /var/run/secrets/kubernetes.io/serviceaccount/
 * - Local dev: Uses KUBECONFIG env var or ~/.kube/config
 *
 * The fabric8 client handles both cases automatically via Config.autoConfigure().
 */
@Configuration
public class KubernetesConfig {

    private static final Logger log = LoggerFactory.getLogger(KubernetesConfig.class);

    @Bean
    public KubernetesClient kubernetesClient() {
        try {
            KubernetesClient client = new KubernetesClientBuilder().build();
            log.info("Kubernetes client initialized — master URL: {}",
                    client.getConfiguration().getMasterUrl());
            return client;
        } catch (Exception e) {
            log.warn("Failed to initialize Kubernetes client. " +
                     "K8s operations will fail until a cluster is available. Error: {}", e.getMessage());
            // Return a client anyway — it will fail on actual API calls
            // but won't prevent the application from starting (useful for local DB-only dev)
            Config config = new ConfigBuilder()
                    .withMasterUrl("https://localhost:6443")
                    .withTrustCerts(true)
                    .build();
            return new KubernetesClientBuilder().withConfig(config).build();
        }
    }
}
