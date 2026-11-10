# CampusHire
MERN job & internship board (students ↔ recruiters) on AWS, delivered entirely through DevOps tooling.

```
backend/    Node + Express + Mongoose API (Cognito JWT auth, S3 pre-signed resumes, SES emails) + Jest + Dockerfile
frontend/   React (Vite) SPA
infra/      bootstrap/ (state bucket + GitHub OIDC)   terraform/ (VPC, EC2, ALB, Cognito, S3, CloudFront, ECR, CloudWatch, SES)
ansible/    roles: common, docker, k3s_server, k3s_agent, cloudwatch_agent, app_deploy
k8s/        Deployment, Service, HPA, PDB, ConfigMap templates
.github/    CI/CD pipeline (test → terraform → ansible → docker → kubernetes → S3/CloudFront)
docs/SETUP.md   ← start here
```
