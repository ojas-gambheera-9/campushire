resource "aws_cloudwatch_log_group" "app" {
  name              = "/${var.project}/app"
  retention_in_days = 14
}
resource "aws_cloudwatch_log_group" "system" {
  name              = "/${var.project}/system"
  retention_in_days = 14
}

resource "aws_sns_topic" "alarms" {
  name = "${local.name}-alarms"
}
resource "aws_sns_topic_subscription" "email" {
  count     = var.alarm_email == "" ? 0 : 1
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${local.name}-alb-5xx"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_Target_5XX_Count"
  dimensions          = { LoadBalancer = aws_lb.main.arn_suffix }
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 5
  datapoints_to_alarm = 3
  threshold           = 5
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
}

resource "aws_cloudwatch_metric_alarm" "unhealthy_hosts" {
  alarm_name          = "${local.name}-unhealthy-hosts"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "UnHealthyHostCount"
  dimensions          = { LoadBalancer = aws_lb.main.arn_suffix, TargetGroup = aws_lb_target_group.api.arn_suffix }
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 3
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
}

resource "aws_cloudwatch_metric_alarm" "cpu" {
  count               = var.node_count
  alarm_name          = "${local.name}-node-${count.index}-cpu"
  namespace           = "AWS/EC2"
  metric_name         = "CPUUtilization"
  dimensions          = { InstanceId = aws_instance.node[count.index].id }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"
  alarm_actions       = [aws_sns_topic.alarms.arn]
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = local.name
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric", x = 0, y = 0, width = 12, height = 6
        properties = {
          title = "ALB requests & 5xx", region = var.aws_region, stat = "Sum", period = 60
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main.arn_suffix],
            [".", "HTTPCode_Target_5XX_Count", ".", "."],
          ]
        }
      },
      {
        type = "metric", x = 12, y = 0, width = 12, height = 6
        properties = {
          title   = "Target response time (p95)", region = var.aws_region, stat = "p95", period = 60
          metrics = [["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.main.arn_suffix]]
        }
      },
      {
        type = "metric", x = 0, y = 6, width = 12, height = 6
        properties = {
          title   = "Node CPU", region = var.aws_region, stat = "Average", period = 300
          metrics = [for i in aws_instance.node : ["AWS/EC2", "CPUUtilization", "InstanceId", i.id]]
        }
      },
      {
        type = "metric", x = 12, y = 6, width = 12, height = 6
        properties = {
          title = "Healthy / unhealthy nodes", region = var.aws_region, stat = "Maximum", period = 60
          metrics = [
            ["AWS/ApplicationELB", "HealthyHostCount", "LoadBalancer", aws_lb.main.arn_suffix, "TargetGroup", aws_lb_target_group.api.arn_suffix],
            [".", "UnHealthyHostCount", ".", ".", ".", "."],
          ]
        }
      },
      {
        type = "log", x = 0, y = 12, width = 24, height = 6
        properties = {
          title = "Recent API errors", region = var.aws_region, view = "table"
          query = "SOURCE '${aws_cloudwatch_log_group.app.name}' | fields @timestamp, @message | filter @message like /(?i)error| 5\\d\\d /| sort @timestamp desc | limit 50"
        }
      },
    ]
  })
}
