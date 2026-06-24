# ═══════════════════════════════════════════════════════════════
# GameCont — RDS PostgreSQL (Free Tier)
# ═══════════════════════════════════════════════════════════════
# Free Tier: 750 hrs/month db.t3.micro, 20 GB gp2 storage
# Single-AZ only (Multi-AZ costs extra).

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet"
  subnet_ids = [aws_subnet.public.id, aws_subnet.public_b.id]

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

resource "aws_db_instance" "postgres" {
  identifier = "${var.project_name}-db"

  # Free Tier: db.t3.micro, 20 GB gp2
  engine               = "postgres"
  engine_version       = "16.3"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  storage_type         = "gp2"
  storage_encrypted    = false  # Not available on Free Tier instance class

  # Database credentials
  db_name  = "gamecont"
  username = var.db_username
  password = var.db_password

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false  # Only K3s server can reach it

  # Backup (Free Tier includes 20 GB backup storage)
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Free Tier constraints
  multi_az            = false
  skip_final_snapshot = true  # Set false for production!

  # Performance Insights (free for db.t3.micro)
  performance_insights_enabled = true

  tags = {
    Name = "${var.project_name}-postgresql"
  }
}
