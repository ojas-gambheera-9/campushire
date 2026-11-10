terraform {
  required_version = ">= 1.10"
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 5.80" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }
  # Bucket/key/region are injected with -backend-config (see docs/SETUP.md & CI).
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = { Project = var.project, Environment = var.environment, ManagedBy = "terraform" }
  }
}

# CloudFront WAF/ACM-style global resources are not used, so no us-east-1 alias is needed.
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" { state = "available" }
