# 1. Provision Cloudflare Workers KV Namespace for Student Task Storage
resource "cloudflare_workers_kv_namespace" "student_tasks" {
  account_id = var.cloudflare_account_id
  title      = "${var.kv_namespace_name}-${var.environment}"
}

# 2. Provision Cloudflare Worker Script with KV Namespace Binding
resource "cloudflare_workers_script" "student_task_manager" {
  account_id = var.cloudflare_account_id
  name       = "${var.worker_name}-${var.environment}"
  content    = file("${path.module}/../application/worker.js")
  module     = true

  kv_namespace_binding {
    name         = "TASKS_KV"
    namespace_id = cloudflare_workers_kv_namespace.student_tasks.id
  }
}
