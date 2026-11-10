data "aws_ssm_parameter" "ubuntu" {
  name = "/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id"
}

resource "aws_key_pair" "nodes" {
  key_name   = "${local.name}-key"
  public_key = var.ssh_public_key
}

resource "aws_instance" "node" {
  count                  = var.node_count
  ami                    = data.aws_ssm_parameter.ubuntu.value
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public[count.index % 2].id
  vpc_security_group_ids = [aws_security_group.nodes.id]
  key_name               = aws_key_pair.nodes.key_name
  iam_instance_profile   = aws_iam_instance_profile.node.name

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2 # pods are one network hop behind the host
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 30
    encrypted   = true
  }

  tags = {
    Name = "${local.name}-node-${count.index}"
    Role = count.index == 0 ? "k8s-server" : "k8s-agent"
  }

  lifecycle { ignore_changes = [ami] } # don't replace nodes when Canonical publishes a new image
}

# Stable public IPs: they survive stop/start and can be allow-listed in MongoDB Atlas.
resource "aws_eip" "node" {
  count      = var.node_count
  instance   = aws_instance.node[count.index].id
  domain     = "vpc"
  depends_on = [aws_internet_gateway.igw]
  tags       = { Name = "${local.name}-node-${count.index}-eip" }
}
