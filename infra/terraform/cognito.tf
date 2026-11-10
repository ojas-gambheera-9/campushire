resource "aws_cognito_user_pool" "main" {
  name                     = "${local.name}-users"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = false
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Role chosen at sign-up (Student | Recruiter). Immutable afterwards so users can't escalate.
  schema {
    name                = "role"
    attribute_data_type = "String"
    mutable             = false
    required            = false
    string_attribute_constraints {
      min_length = 7
      max_length = 9
    }
  }
  schema {
    name                = "company"
    attribute_data_type = "String"
    mutable             = true
    required            = false
    string_attribute_constraints {
      min_length = 0
      max_length = 140
    }
  }
}

resource "aws_cognito_user_pool_client" "web" {
  name            = "${local.name}-web"
  user_pool_id    = aws_cognito_user_pool.main.id
  generate_secret = false

  explicit_auth_flows = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
  read_attributes     = ["email", "email_verified", "name", "custom:role", "custom:company"]
  write_attributes    = ["email", "name", "custom:role", "custom:company"]

  prevent_user_existence_errors = "ENABLED"
  access_token_validity         = 60
  id_token_validity             = 60
  refresh_token_validity        = 30
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}
