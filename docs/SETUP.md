# CampusHire — Setup Guide (AWS + Terraform + Ansible + Docker + Kubernetes)

Everything is created by code. After the one-time bootstrap below, **every `git push` to `main`** runs:
`test (Jest + coverage) → terraform apply → ansible → SonarQube quality gate → docker build/push → kubernetes rolling deploy (+ Prometheus/Grafana) → S3/CloudFront publish`.
If tests fail, nothing else runs.

## What you get
| Layer | Resource |
|---|---|
| Edge | CloudFront (HTTPS) → S3 for the React SPA, `/api/*` → ALB |
| Compute | VPC, 2 public subnets, ALB, `node_count` × EC2 (Ubuntu 22.04) running **k3s** Kubernetes + Docker |
| App | Express API as a Deployment (2–6 pods, HPA), NodePort 30080 behind the ALB |
| Data | MongoDB Atlas (external), resumes in private S3 via pre-signed URLs |
| Identity / email | Cognito user pool (custom `role` attribute), SES |
| Observability | **Prometheus** (scrapes API `/metrics` + node-exporter), **Grafana** dashboard at `/grafana`, **Alertmanager** → SNS email |
| Code quality | **SonarQube** on its own EC2 (t3.medium); CI fails if the quality gate fails |
| Registry | ECR (nodes pull via an auto-refreshed pull secret) |

> k3s is used as the Kubernetes distribution (single binary, runs well on 2 GB nodes). Everything else matches the deck.

## Prerequisites (on your laptop)
AWS account + admin CLI credentials (`aws configure`), Terraform ≥ 1.10, `ssh-keygen`, a GitHub repo, a free MongoDB Atlas M0 cluster.

## 1. SSH deploy key
```bash
ssh-keygen -t ed25519 -f ~/.ssh/campushire -N ""
```

## 2. One-time bootstrap (state bucket + GitHub OIDC role)
```bash
cd infra/bootstrap
terraform init
terraform apply \
  -var state_bucket_name=campushire-tfstate-<something-unique> \
  -var github_repo=<your-gh-user>/<repo>
```
Note the outputs `state_bucket` and `github_deploy_role_arn`.
(If the account already has a GitHub OIDC provider, add `-var create_oidc_provider=false`.)

## 3. MongoDB Atlas
Create an M0 cluster and a database user. After the first pipeline run, add the node Elastic IPs
(`terraform output node_public_ips`) to **Network Access**. For a first test you can temporarily allow `0.0.0.0/0`.
Copy the `mongodb+srv://…/campushire` connection string.

## 4. GitHub settings (Settings → Secrets and variables → Actions)
**Variables:** `AWS_ROLE_ARN` (from bootstrap), `TF_STATE_BUCKET`, `AWS_REGION` (`ap-south-1`), `SES_FROM_EMAIL` (an inbox you can open), `ALARM_EMAIL` (optional)
**Secrets:** `SSH_PRIVATE_KEY` (contents of `~/.ssh/campushire`), `MONGODB_URI`, `GRAFANA_ADMIN_PASSWORD` (any strong password you choose; it is the Grafana `admin` login), `SONAR_TOKEN` (added after step 6.5; until then the quality gate is skipped with a warning)

## 5. Ship it
```bash
git init && git add . && git commit -m "CampusHire" && git branch -M main
git remote add origin git@github.com:<you>/<repo>.git && git push -u origin main
```
Watch Actions. First run takes ~10–15 min (EC2 boot, k3s install, CloudFront creation).
The run summary prints the live URL (`https://dxxxx.cloudfront.net`).

## 6. After the first run
1. **SES:** open the verification email AWS sent to `SES_FROM_EMAIL` and click the link. New accounts are in the SES *sandbox*: you can only email verified addresses until you request production access (SES console → Account dashboard).
2. **Atlas:** add the Elastic IPs (step 3).
3. **Alerts:** confirm the SNS subscription email if you set `ALARM_EMAIL` (Alertmanager publishes to that topic).
4. Open the site, sign up as a Recruiter (verification code arrives by email), post a job; sign up as a Student in another browser, apply with a PDF, then shortlist from the recruiter dashboard and watch the email arrive.

5. **SonarQube (one-time):** open the `SonarQube:` URL from the run summary (`http://<sonar_ip>:9000`), log in as `admin` / `admin`, set a new password, then My Account → Security → generate a *User* token. Add it as the `SONAR_TOKEN` repository secret and re-run the workflow; the `sonar` job now enforces the quality gate.
6. **Grafana:** open `https://<cloudfront>/grafana/`, log in as `admin` with `GRAFANA_ADMIN_PASSWORD`; the *CampusHire Overview* dashboard is under the CampusHire folder.

## Useful commands
```bash
ssh -i ~/.ssh/campushire ubuntu@<server_ip>
sudo k3s kubectl -n campushire get pods,svc,hpa -o wide
sudo k3s kubectl -n campushire logs deploy/campushire-api --tail=100
sudo k3s kubectl -n campushire rollout undo deploy/campushire-api   # roll back
```
```bash
sudo k3s kubectl -n monitoring get pods                     # prometheus, alertmanager, grafana, node-exporter
sudo k3s kubectl -n monitoring port-forward svc/prometheus 9090 --address 127.0.0.1   # then ssh -L 9090:localhost:9090
```
Metrics and dashboards: Grafana. Logs: `kubectl logs` (CloudWatch Logs were removed with the CloudWatch agent).

## Run locally
```bash
cd backend && npm ci && npm test
MONGODB_URI=… COGNITO_USER_POOL_ID=… COGNITO_CLIENT_ID=… S3_BUCKET=… SES_FROM_EMAIL=… AWS_REGION=ap-south-1 npm run dev   # needs AWS creds in env for S3/SES
cd frontend && cp .env.example .env && npm ci && npm run dev    # proxies /api → :8080
```

## Cost (approx., ap-south-1, running 24×7)
2 × t3.small ≈ $30–35, SonarQube t3.medium ≈ $33 (+ its IP ≈ $4), ALB ≈ $18–20, public IPv4 addresses ≈ $10–12, CloudFront/S3 a few dollars → **roughly $95–115/month**. Cut it with `node_count = 1`, or `enable_sonarqube = false` (saves ≈ $37). Tear everything down with:
`cd infra/terraform && terraform destroy` (then the bootstrap stack if you want it gone; empty the resumes bucket first).

## Known limitations (be upfront in your viva)
- **Recruiter sign-up is self-service.** Anyone can pick “Recruiter”. Production fix: put recruiters in a Cognito group via an admin-approval flow.
- **SSH is open to the world by default** (CI runners have no fixed IP). Set `ssh_cidr` to your IP and run Ansible from there, or switch Ansible to SSM Session Manager.
- **Deploy role is AdministratorAccess** (Terraform creates IAM/VPC/etc.). Scope it down once the stack is stable.
- CloudFront → ALB is HTTP inside AWS’s network; add a custom domain + ACM cert for end-to-end TLS.
- No WAF, no multi-region; control-plane node also runs workloads (single control plane is not HA).
- Terraform/Ansible were syntax-checked but not applied against a live AWS account by the author of this scaffold — expect a small fix or two on first run; the troubleshooting list below covers the likely ones.

## Troubleshooting
| Symptom | Likely cause |
|---|---|
| Pipeline fails at `terraform init` | `TF_STATE_BUCKET` / role ARN variable wrong; role trust repo name mismatch |
| `InvalidParameterValue … ses` or no emails | SES sender not verified / recipient not verified (sandbox) |
| Ansible can’t SSH | Node still booting (wait step covers ~5 min), wrong `SSH_PRIVATE_KEY`, `ssh_cidr` too tight |
| Pods `ImagePullBackOff` | `ecr-login` timer failed: `sudo journalctl -u ecr-login` on the server node |
| API pods `CrashLoopBackOff` | Atlas IP allow-list or bad `MONGODB_URI`: check `kubectl logs` |
| ALB targets unhealthy | Pods not ready yet; `curl localhost:30080/health` on a node |
| S3 upload blocked in browser | Open the site via the CloudFront URL (bucket CORS allows only that origin) |
