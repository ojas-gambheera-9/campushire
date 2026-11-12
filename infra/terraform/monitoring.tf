# Alert delivery only. Metrics, dashboards and alert rules live in the cluster (Prometheus, Grafana,
# Alertmanager: see k8s/monitoring). Alertmanager publishes to this SNS topic, which emails the owner.
resource "aws_sns_topic" "alarms" {
  name = "${local.name}-alarms"
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.alarm_email == "" ? 0 : 1
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}
