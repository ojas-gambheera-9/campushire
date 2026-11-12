# Dedicated host for SonarQube Community (code-quality / security gate for CI).
# Kept off the Kubernetes nodes: its embedded Elasticsearch needs about 4 GB of RAM.
resource "aws_instance" "sonar" {
  count                  = var.enable_sonarqube ? 1 : 0
  ami                    = data.aws_ssm_parameter.ubuntu.value
  instance_type          = var.sonar_instance_type
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.sonar[0].id]
  key_name               = aws_key_pair.nodes.key_name
  iam_instance_profile   = aws_iam_instance_profile.sonar[0].name

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 30
    encrypted   = true
  }

  tags = { Name = "${local.name}-sonarqube", Role = "sonarqube" }

  lifecycle { ignore_changes = [ami] }
}

resource "aws_eip" "sonar" {
  count      = var.enable_sonarqube ? 1 : 0
  instance   = aws_instance.sonar[0].id
  domain     = "vpc"
  depends_on = [aws_internet_gateway.igw]
  tags       = { Name = "${local.name}-sonarqube-eip" }
}
