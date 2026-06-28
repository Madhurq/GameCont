# 🎮 GameCont — Multiplayer Game Server Hosting Platform

A Kubernetes-powered platform where users create, manage, and auto-scale dedicated game servers through a dashboard.

> **Built for AWS Free Tier** — Designed to run on a single `t3.micro` EC2 instance with K3s (lightweight Kubernetes). Zero cost within AWS Free Tier limits.
>
> **Local Development** — Everything works on your machine with Kind (local K8s), Docker Compose, and the frontend dev server.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    React Frontend                            │
│  Server Dashboard · Create Server · Console                   │
└─────────┬────────────────┬───────────────────────────────────┘
          │ REST            │ STOMP over WebSocket
    ┌─────▼──────────┐     │
    │  Platform API  ◄─────┘
    │  (Spring Boot) │
    │                │
    │ • Auth (JWT)   │
    │ • Server CRUD  │
    │ • K8s API      │
    │ • Log Stream   │
    └──┬─────────────┘
       │
  ┌────▼───────────────────────────────────────────────┐
  │        K3s Cluster (single EC2 t3.micro)           │
  │                                                     │
  │  ┌─────────────────────────────────────────────┐   │
  │  │ Namespace: gamecont-servers                  │   │
  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐    │   │
   │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐    │   │
   │  │  │ Server-1 │ │ Server-2 │ │ Server-3 │    │   │
   │  │  └──────────┘ └──────────┘ └──────────┘    │   │
   │  └─────────────────────────────────────────────┘   │
  └────────────────────────────────────────────────────┘
```

## ⚠️ Resource Constraints (AWS Free Tier)

This project is designed to run within **AWS Free Tier limits**:

| Resource | Free Tier Limit | Our Usage |
|----------|----------------|-----------|
| EC2 | 750 hrs/month `t3.micro` (2 vCPU burst, 1 GB RAM) | 1 instance 24/7 |
| RDS PostgreSQL | 750 hrs/month `db.t3.micro` (20 GB gp2) | 1 instance |
| EBS Storage | 30 GB | K3s data + PVCs |
| Public IPv4 | 750 hrs/month | 1 address |
| **Monthly Cost** | | **$0** |

**What this means in practice:**
- ✅ Platform API + K3s control plane runs fine on 1 GB RAM
- ✅ 1-2 lightweight game servers for demo/development
- ⚠️ For production load (many concurrent game servers), upgrade to `t3.medium`+ or add worker nodes
- ⚠️ K3s replaces EKS ($73/month saved) — same K8s API, just self-managed
- ⚠️ `@Async` replaces RabbitMQ (~400 MB RAM saved) — swappable to SQS/RabbitMQ at scale

**Scaling beyond Free Tier** is a config change: add EC2 worker nodes to the K3s cluster via Terraform, upgrade instance types, and optionally swap in EKS.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend API** | Spring Boot 3.2 (Java 21) | REST API, WebSocket, auth |
| **K8s Client** | Fabric8 7.x | Create/manage K8s resources programmatically |
| **Database** | PostgreSQL (RDS) | Users, server configs, audit logs |
| **Auth** | JWT (JJWT) | Stateless authentication |
| **Real-time** | STOMP over WebSocket | Live log streaming, status updates |

| **Infrastructure** | Terraform + Ansible | AWS provisioning, K3s setup |
| **CI/CD** | GitHub Actions | Automated test, build, deploy |
| **Kubernetes** | K3s (lightweight K8s) | Game server orchestration |
| **Container Registry** | GitHub Container Registry | Docker image storage |

## Project Structure

```
gamecont/
├── platform-api/              # Spring Boot backend (Maven)
│   ├── src/main/java/com/gamecont/platform/
│   │   ├── controller/        # REST + WebSocket endpoints
│   │   ├── service/           # Business logic + K8s integration
│   │   ├── model/             # JPA entities
│   │   ├── repository/        # Spring Data JPA repos
│   │   ├── dto/               # Request/response objects
│   │   ├── config/            # Spring configuration
│   │   └── security/          # JWT auth filter
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/      # Flyway SQL migrations
│   ├── pom.xml
│   └── Dockerfile
│
├── server-images/             # Game server Docker images
│   ├── minecraft-vanilla/
│   └── minecraft-modded/
│
├── k8s/                       # Kubernetes manifests
│   ├── platform/              # Platform service deployment
│   ├── namespace.yaml
│   ├── resource-quota.yaml
│   └── network-policy.yaml
│
├── terraform/                 # AWS infrastructure (Free Tier)
│   ├── main.tf                # EC2 (t3.micro) + K3s
│   ├── database.tf            # RDS PostgreSQL (db.t3.micro)
│   ├── networking.tf          # VPC, SG, subnets
│   └── variables.tf
│
├── ansible/                   # Configuration management
│   ├── playbooks/
│   └── templates/
│
├── .github/workflows/         # CI/CD pipelines
├── docker-compose.yml         # Local development stack
└── README.md
```

## Quick Start (Local Development)

### Prerequisites
- Java 21+
- Maven 3.9+
- Docker & Docker Compose
- Kind (Kubernetes in Docker) — `go install sigs.k8s.io/kind@latest` or `choco install kind`
- kubectl

### 1. Create local K8s cluster
```bash
kind create cluster --config k8s/kind-config.yaml
```

This creates a Kind cluster with ports 30000-30005 mapped for Minecraft server NodePort access.

### 2. Start infrastructure
```bash
docker compose up -d
```

This starts PostgreSQL (port 5433) and Redis locally.

### 3. Set up frontend env
If you don't have a `.env.local` file yet, copy the example:
```bash
cp frontend/.env.example frontend/.env.local
```

Edit `.env.local` to point to `localhost`:
```env
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=http://localhost:8080/ws
```

### 4. Run the platform API
```bash
cd platform-api
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

The API starts on port 8080. It connects to your local Kind cluster via `~/.kube/config`, and uses Docker Compose PostgreSQL + Redis.

### 5. Run the frontend
```bash
cd frontend
npm install   # first time only
npm run dev
```

### 6. Access
- **Frontend**: http://localhost:5173
- **API**: http://localhost:8080
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **Actuator Health**: http://localhost:8080/actuator/health

### Simulator mode (frontend only)
The frontend can run standalone without a backend:
```bash
cd frontend
npm run dev
```
It ships with mock data and a fake WebSocket log stream. Log in with any username/password.

### Local dev note: connect address
When running locally, the `connectAddress` returned by the API uses the Kind node's Docker IP (e.g., `172.18.0.x:31001`) instead of `localhost`. Your Minecraft client can't reach Docker-internal IPs directly. There are two workarounds:

- **Set `platformPublicIp`** via K8s ConfigMap: `kubectl create configmap platform-config -n gamecont-platform --from-literal=public-ip=localhost`
- **Or just connect manually** using the proxy port shown in the server detail UI: `localhost:<proxyPort>`
## API Overview

```
POST   /api/auth/register          Register a new user
POST   /api/auth/login             Login → JWT token
GET    /api/servers                 List your servers
POST   /api/servers                Create a game server
GET    /api/servers/{id}           Get server details
DELETE /api/servers/{id}           Delete a server
POST   /api/servers/{id}/start    Start a stopped server
POST   /api/servers/{id}/stop     Stop a running server
POST   /api/servers/{id}/restart  Restart a server
WS     /ws                        STOMP WebSocket endpoint
```

## Key Features

- **Dynamic Server Provisioning**: User clicks "Create" → K8s Deployment + Service + PVC created in ~30s
- **Scale-to-Zero**: Idle servers (0 players for 10 min) auto-scale to 0 replicas, preserving world data on PVCs
- **Wake-on-Connect**: TCP proxy detects player join attempts → wakes sleeping server in ~15s
- **Real-time Logs**: STOMP WebSocket streams pod logs to the browser console
- **Multi-tenant Isolation**: NetworkPolicies block server-to-server traffic, ResourceQuotas limit per-namespace resources

## License

MIT
