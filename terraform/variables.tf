variable "cloudflare_account_id" {
  description = "Cloudflare account ID that owns the Worker and KV storage."
  type        = string
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token with Workers and Workers KV permissions."
  type        = string
  sensitive   = true
}

variable "worker_name" {
  description = "Name of the deployed Cloudflare Worker."
  type        = string
  default     = "student-task-manager"
}

variable "kv_namespace_name" {
  description = "Name of the Workers KV namespace."
  type        = string
  default     = "student_tasks"
}

variable "environment" {
  description = "Deployment environment (e.g. dev, test, production)."
  type        = string
  default     = "production"
}

