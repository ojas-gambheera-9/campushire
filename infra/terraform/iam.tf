data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "node" {
  name               = "${local.name}-node"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

# API pods obtain these via the instance profile (IMDSv2, hop limit 2) — no static keys anywhere.
data "aws_iam_policy_document" "node_app" {
  statement {
    sid       = "ResumeObjects"
    actions   = ["s3:GetObject", "s3:PutObject"]
    resources = ["${aws_s3_bucket.resumes.arn}/*"]
  }
  statement {
    sid       = "SendStatusEmails"
    actions   = ["ses:SendEmail", "ses:SendRawEmail"]
    resources = ["*"]
  }
  statement {
    sid       = "PublishAlerts"
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.alarms.arn]
  }
  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "node_app" {
  name   = "app-access"
  role   = aws_iam_role.node.id
  policy = data.aws_iam_policy_document.node_app.json
}

resource "aws_iam_role_policy_attachment" "ecr_read" {
  role       = aws_iam_role.node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "node" {
  name = "${local.name}-node"
  role = aws_iam_role.node.name
}

# SonarQube host: no application permissions, only Systems Manager access.
resource "aws_iam_role" "sonar" {
  count              = var.enable_sonarqube ? 1 : 0
  name               = "${local.name}-sonar"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}
resource "aws_iam_role_policy_attachment" "sonar_ssm" {
  count      = var.enable_sonarqube ? 1 : 0
  role       = aws_iam_role.sonar[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
resource "aws_iam_instance_profile" "sonar" {
  count = var.enable_sonarqube ? 1 : 0
  name  = "${local.name}-sonar"
  role  = aws_iam_role.sonar[0].name
}
