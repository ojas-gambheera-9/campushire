# AWS emails a verification link to this address; click it once after the first apply.
# New SES accounts start in the sandbox: recipients must be verified too until you request production access.
resource "aws_ses_email_identity" "sender" {
  email = var.ses_from_email
}
