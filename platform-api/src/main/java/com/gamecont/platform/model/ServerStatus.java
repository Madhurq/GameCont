package com.gamecont.platform.model;

/**
 * Lifecycle states of a game server.
 *
 * State transitions:
 *   STARTING → RUNNING → STOPPING → STOPPED
 *                ↓                      ↑
 *             SLEEPING ────────────────┘  (wake-on-connect)
 *   Any state → ERROR (on crash/failure)
 */
public enum ServerStatus {

    /** K8s Deployment created, pod is initializing */
    STARTING,

    /** Pod is ready, game server is accepting players */
    RUNNING,

    /** User requested stop, pod is terminating */
    STOPPING,

    /** Deployment scaled to 0, PVC preserved */
    STOPPED,

    /** Auto-scaled to 0 by IdleServerReaper (wake-on-connect enabled) */
    SLEEPING,

    /** Pod crashed or entered CrashLoopBackOff */
    ERROR
}
