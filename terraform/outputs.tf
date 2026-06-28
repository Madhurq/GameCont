# ═══════════════════════════════════════════════════════════════
# GameCont — Terraform Outputs
# ═══════════════════════════════════════════════════════════════

output "k3s_public_ip" {
  description = "Public IP of the K3s server (use for game server connections)"
  value       = aws_eip.k3s.public_ip
}

output "k3s_ssh_command" {
  description = "SSH command to connect to the K3s server"
  value       = "ssh -i ~/.ssh/${var.key_name}.pem ec2-user@${aws_eip.k3s.public_ip}"
}

output "platform_api_url" {
  description = "Platform API URL (NodePort)"
  value       = "http://${aws_eip.k3s.public_ip}:30080"
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "kubeconfig_command" {
  description = "Command to copy kubeconfig from EC2 to local machine"
  value       = "scp -i ~/.ssh/${var.key_name}.pem ec2-user@${aws_eip.k3s.public_ip}:/etc/rancher/k3s/k3s.yaml ./kubeconfig.yaml"
}
