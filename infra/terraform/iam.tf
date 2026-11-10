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

resource "aws_iam_role_policy_attachment" "cw_agent" {
  role       = aws_iam_role.node.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
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
