output "worker_name" {
  description = "Name of the provisioned Cloudflare Worker."
  value       = cloudflare_workers_script.student_task_manager.name
}

output "kv_namespace_id" {
  description = "Provisioned Cloudflare Workers KV Namespace ID."
  value       = cloudflare_workers_kv_namespace.student_tasks.id
}

output "kv_namespace_title" {
  description = "Title of the Workers KV Namespace."
  value       = cloudflare_workers_kv_namespace.student_tasks.title
}
