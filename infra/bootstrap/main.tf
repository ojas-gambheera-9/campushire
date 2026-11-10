# One-time bootstrap (run locally with admin credentials):
#   - S3 bucket for Terraform remote state (native lockfile locking)
#   - GitHub Actions OIDC provider + deploy role (no long-lived AWS keys in GitHub)
terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.80" }
    tls = { source = "hashicorp/tls", version = "~> 4.0" }
  }
}

variable "aws_region" {
  type    = string
  default = "ap-south-1"
}
variable "state_bucket_name" {
  type        = string
  description = "Globally unique bucket name for Terraform state, e.g. campushire-tfstate-<yourname>"
}
variable "github_repo" {
  type        = string
  description = "owner/repo that is allowed to assume the deploy role, e.g. srikar/campushire"
}
variable "create_oidc_provider" {
  type        = bool
  default     = true
  description = "Set false if token.actions.githubusercontent.com OIDC provider already exists in this account"
}

provider "aws" {
  region = var.aws_region
}

resource "aws_s3_bucket" "state" {
  bucket = var.state_bucket_name
  lifecycle { prevent_destroy = true }
}
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}
resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com/.well-known/openid-configuration"
}
resource "aws_iam_openid_connect_provider" "github" {
  count           = var.create_oidc_provider ? 1 : 0
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]
}
data "aws_caller_identity" "me" {}

locals {
  oidc_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : "arn:aws:iam::${data.aws_caller_identity.me.account_id}:oidc-provider/token.actions.githubusercontent.com"
}

resource "aws_iam_role" "github_deploy" {
  name = "campushire-github-deploy"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = local.oidc_arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = { "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com" }
        StringLike   = { "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*" }
      }
    }]
  })
}
# Terraform creates IAM, VPC, EC2, CloudFront etc., so the role needs broad rights.
# Tighten later by replacing with a scoped policy once the stack is stable.
resource "aws_iam_role_policy_attachment" "admin" {
  role       = aws_iam_role.github_deploy.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

output "state_bucket" { value = aws_s3_bucket.state.id }
output "github_deploy_role_arn" { value = aws_iam_role.github_deploy.arn }
output "aws_region" { value = var.aws_region }
