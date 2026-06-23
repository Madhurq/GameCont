package com.gamecont.platform.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Async thread pool configuration for non-blocking server provisioning.
 *
 * When a user creates a game server, the K8s resource creation runs on this pool
 * so the REST endpoint returns immediately with status=STARTING.
 *
 * ⚠️ Pool is sized conservatively for t3.micro (1 GB RAM):
 *    - Core pool: 2 threads
 *    - Max pool: 4 threads
 *    - Queue: 10 pending tasks
 *
 * This replaces RabbitMQ for async job processing on Free Tier.
 * Swap to @RabbitListener + SQS when scaling beyond a single instance.
 */
@Configuration
public class AsyncConfig implements AsyncConfigurer {

    @Override
    @Bean(name = "serverProvisioningExecutor")
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(10);
        executor.setThreadNamePrefix("k8s-provision-");
        executor.setRejectedExecutionHandler((r, e) -> {
            throw new RuntimeException("Server provisioning queue is full. Try again later.");
        });
        executor.initialize();
        return executor;
    }
}
