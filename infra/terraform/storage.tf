resource "random_id" "suffix" {
  byte_length = 3
}

# ---------- Resume uploads (private, pre-signed access only) ----------
resource "aws_s3_bucket" "resumes" {
  bucket        = "${local.name}-resumes-${random_id.suffix.hex}"
  force_destroy = false
}
resource "aws_s3_bucket_public_access_block" "resumes" {
  bucket                  = aws_s3_bucket.resumes.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_server_side_encryption_configuration" "resumes" {
  bucket = aws_s3_bucket.resumes.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}
# Browsers PUT the PDF directly to S3 using the pre-signed URL.
resource "aws_s3_bucket_cors_configuration" "resumes" {
  bucket = aws_s3_bucket.resumes.id
  cors_rule {
    allowed_methods = ["PUT"]
    allowed_origins = ["https://${aws_cloudfront_distribution.web.domain_name}"]
    allowed_headers = ["*"]
    max_age_seconds = 3000
  }
}

# ---------- React SPA assets (served only through CloudFront) ----------
resource "aws_s3_bucket" "web" {
  bucket        = "${local.name}-web-${random_id.suffix.hex}"
  force_destroy = true
}
resource "aws_s3_bucket_public_access_block" "web" {
  bucket                  = aws_s3_bucket.web.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_policy" "web" {
  bucket = aws_s3_bucket.web.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontOAC"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.web.arn}/*"
      Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.web.arn } }
    }]
  })
}

# ---------- Container registry ----------
resource "aws_ecr_repository" "api" {
  name                 = "${var.project}-api"
  image_tag_mutability = "MUTABLE"
  force_delete         = true
  image_scanning_configuration { scan_on_push = true }
}
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 15 images"
      selection    = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 15 }
      action       = { type = "expire" }
    }]
  })
}
