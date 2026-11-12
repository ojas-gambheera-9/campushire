#!/usr/bin/env bash
# Builds ansible/inventory.ini from `terraform output -json` (passed on stdin or as a file path).
# Usage: terraform output -json > tf.json && scripts/gen_inventory.sh tf.json ~/.ssh/campushire > ansible/inventory.ini
set -euo pipefail
OUT="${1:?path to terraform output json}"
KEY="${2:?path to ssh private key}"
echo "[k8s_server]"
echo "node0 ansible_host=$(jq -r .server_public_ip.value "$OUT") private_ip=$(jq -r .server_private_ip.value "$OUT")"
echo
echo "[k8s_agents]"
i=1; for ip in $(jq -r '.agent_public_ips.value[]' "$OUT"); do echo "node$i ansible_host=$ip"; i=$((i+1)); done
if [ "$(jq -r '.sonar_enabled.value // false' "$OUT")" = "true" ]; then
  echo
  echo "[sonarqube]"
  echo "sonar0 ansible_host=$(jq -r .sonar_public_ip.value "$OUT")"
fi
cat <<EOT

[k8s:children]
k8s_server
k8s_agents

[all:vars]
ansible_user=ubuntu
ansible_ssh_private_key_file=$KEY
EOT
