# ═══════════════════════════════════════════════════════════════
# GameCont — Main Terraform Configuration
# ═══════════════════════════════════════════════════════════════
# Provisions a single EC2 t3.micro with K3s for game server hosting.
# Designed to stay within AWS Free Tier ($0/month).
#
# Architecture: EC2 (K3s) + RDS (PostgreSQL) + EBS (PVCs)

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      ManagedBy   = "terraform"
      Environment = "production"
    }
  }
}

# ── Latest Amazon Linux 2023 AMI ─────────────────────────────
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ── EC2 Instance (K3s Server) ─────────────────────────────────
# Free Tier: 750 hrs/month t3.micro = $0
resource "aws_instance" "k3s_server" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.k3s.id]
  subnet_id              = aws_subnet.public.id

  # 30 GB EBS root volume (Free Tier: 30 GB gp2)
  root_block_device {
    volume_size           = 30
    volume_type           = "gp2"
    delete_on_termination = true
  }

  # K3s install script — runs on first boot
  user_data = <<-EOF
    #!/bin/bash
    set -e

    # Update system
    yum update -y

    # Install K3s (lightweight Kubernetes)
    # --disable traefik: we'll use NodePort directly for game servers
    # --write-kubeconfig-mode: allows non-root kubectl
    curl -sfL https://get.k3s.io | sh -s - \
      --write-kubeconfig-mode 644 \
      --disable traefik \
      --kubelet-arg="max-pods=20"

    # Wait for K3s to be ready
    until kubectl get nodes; do sleep 5; done

    # Create namespaces
    kubectl create namespace gamecont-platform --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace gamecont-servers --dry-run=client -o yaml | kubectl apply -f -

    echo "K3s installation complete!"
  EOF

  tags = {
    Name = "${var.project_name}-k3s-server"
  }
}

# ── Elastic IP ────────────────────────────────────────────────
# Free Tier: 1 public IPv4 for 750 hrs/month = $0
resource "aws_eip" "k3s" {
  instance = aws_instance.k3s_server.id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-eip"
  }
}
