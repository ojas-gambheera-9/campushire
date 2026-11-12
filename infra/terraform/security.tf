data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_security_group" "alb" {
  name        = "${local.name}-alb"
  description = "ALB ingress"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "${local.name}-alb-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "alb_cf" {
  count             = var.restrict_alb_to_cloudfront ? 1 : 0
  security_group_id = aws_security_group.alb.id
  description       = "HTTP from CloudFront only"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront.id
}

resource "aws_vpc_security_group_ingress_rule" "alb_world" {
  count             = var.restrict_alb_to_cloudfront ? 0 : 1
  security_group_id = aws_security_group.alb.id
  description       = "HTTP from anywhere"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_egress_rule" "alb_out" {
  security_group_id = aws_security_group.alb.id
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_security_group" "nodes" {
  name        = "${local.name}-nodes"
  description = "Kubernetes nodes"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "${local.name}-nodes-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "nodes_from_alb" {
  security_group_id            = aws_security_group.nodes.id
  description                  = "NodePort from ALB"
  ip_protocol                  = "tcp"
  from_port                    = var.node_port
  to_port                      = var.node_port
  referenced_security_group_id = aws_security_group.alb.id
}

resource "aws_vpc_security_group_ingress_rule" "nodes_grafana_from_alb" {
  security_group_id            = aws_security_group.nodes.id
  description                  = "Grafana NodePort from ALB"
  ip_protocol                  = "tcp"
  from_port                    = var.grafana_node_port
  to_port                      = var.grafana_node_port
  referenced_security_group_id = aws_security_group.alb.id
}

resource "aws_vpc_security_group_ingress_rule" "nodes_self" {
  security_group_id            = aws_security_group.nodes.id
  description                  = "All traffic between cluster nodes (API server, flannel VXLAN, kubelet)"
  ip_protocol                  = "-1"
  referenced_security_group_id = aws_security_group.nodes.id
}

resource "aws_vpc_security_group_ingress_rule" "nodes_ssh" {
  security_group_id = aws_security_group.nodes.id
  description       = "SSH for Ansible"
  ip_protocol       = "tcp"
  from_port         = 22
  to_port           = 22
  cidr_ipv4         = var.ssh_cidr
}

resource "aws_vpc_security_group_egress_rule" "nodes_out" {
  security_group_id = aws_security_group.nodes.id
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

# ---- SonarQube host ----
resource "aws_security_group" "sonar" {
  count       = var.enable_sonarqube ? 1 : 0
  name        = "${local.name}-sonar"
  description = "SonarQube server"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "${local.name}-sonar-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "sonar_ui" {
  count             = var.enable_sonarqube ? 1 : 0
  security_group_id = aws_security_group.sonar[0].id
  description       = "SonarQube UI and scanner API"
  ip_protocol       = "tcp"
  from_port         = 9000
  to_port           = 9000
  cidr_ipv4         = var.sonar_cidr
}

resource "aws_vpc_security_group_ingress_rule" "sonar_ssh" {
  count             = var.enable_sonarqube ? 1 : 0
  security_group_id = aws_security_group.sonar[0].id
  description       = "SSH for Ansible"
  ip_protocol       = "tcp"
  from_port         = 22
  to_port           = 22
  cidr_ipv4         = var.ssh_cidr
}

resource "aws_vpc_security_group_egress_rule" "sonar_out" {
  count             = var.enable_sonarqube ? 1 : 0
  security_group_id = aws_security_group.sonar[0].id
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}
