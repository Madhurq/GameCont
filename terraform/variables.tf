# ═══════════════════════════════════════════════════════════════
# GameCont — Terraform Variables
# ═══════════════════════════════════════════════════════════════

variable "aws_region" {
  description = "AWS region (ap-south-1 = Mumbai)"
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "gamecont"
}

variable "instance_type" {
  description = "EC2 instance type (t3.small)"
  type        = string
  default     = "t3.small"
}

variable "key_name" {
  description = "Name of the EC2 key pair for SSH access"
  type        = string
}

variable "my_ip" {
  description = "Your public IP for SSH access (e.g., '203.0.113.0/32')"
  type        = string
}

variable "game_port_range_start" {
  description = "Start of NodePort range for game servers"
  type        = number
  default     = 30000
}

variable "game_port_range_end" {
  description = "End of NodePort range for game servers"
  type        = number
  default     = 32767
}
