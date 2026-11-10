variable "aws_region" {
  type    = string
  default = "ap-south-1"
}
variable "project" {
  type    = string
  default = "campushire"
}
variable "environment" {
  type    = string
  default = "prod"
}
variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}
variable "node_count" {
  type        = number
  default     = 2
  description = "Total EC2 nodes. Node 0 is the Kubernetes control plane (also schedules pods); the rest are workers."
  validation {
    condition     = var.node_count >= 1 && var.node_count <= 6
    error_message = "node_count must be between 1 and 6."
  }
}
variable "instance_type" {
  type        = string
  default     = "t3.small"
  description = "t3.small (2 GB) is the practical minimum for k3s + the API."
}
variable "ssh_public_key" {
  type        = string
  description = "Public key (ssh-ed25519 ...) installed on every node; Ansible connects with the matching private key."
}
variable "ssh_cidr" {
  type        = string
  default     = "0.0.0.0/0"
  description = "CIDR allowed to reach SSH (22). Restrict to your IP once CI no longer needs it."
}
variable "restrict_alb_to_cloudfront" {
  type        = bool
  default     = true
  description = "Only allow CloudFront origin-facing IPs to reach the ALB (browsers must use the CloudFront URL)."
}
variable "ses_from_email" {
  type        = string
  description = "Sender address for status emails. A verification email is sent by AWS; click the link."
}
variable "alarm_email" {
  type        = string
  default     = ""
  description = "Email subscribed to CloudWatch alarm notifications (leave empty to skip)."
}
variable "node_port" {
  type    = number
  default = 30080
}
