# MINI PROJECT EVALUATION & VIVA CHEAT SHEET

## 1. Live Deployment Details (Your Account: Gaurav Kolhe)
- **Account ID**: `e446a5f48b54b32a95b2003b3f303c90`
- **Cloudflare Worker**: `student-task-manager-production`
- **Workers KV Namespace**: `student_tasks-production`
- **KV Namespace ID**: `231a46a4379a4f7780eaa34665c3fd5d`
- **Workers Subdomain**: `gauravkolhe.workers.dev`
- **Live Application URL**: [https://student-task-manager-production.gauravkolhe.workers.dev/](https://student-task-manager-production.gauravkolhe.workers.dev/)
- **KV Binding**: `TASKS_KV`
- **Provisioning Engine**: HashiCorp Terraform v1.16.6

---

## 2. Pre-Populated Tasks in Workers KV
All 5 required project scenario tasks have been provisioned in your KV namespace:
1. Complete Cloud Computing Assignment [High, Pending]
2. Prepare Project Presentation [Medium, In Progress]
3. Submit Final Year Project Report [High, Pending]
4. Attend Project Viva [High, Pending]
5. Upload Laboratory Assignment [Low, Completed]

---

## 3. Mandatory Viva Answers (Quick Revision)

### Q1. What is Infrastructure as Code (IaC)?
**Answer**: IaC is the practice of defining, provisioning, and managing cloud infrastructure using machine-readable configuration files (like Terraform's `.tf` files) rather than interactive graphical dashboards or manual command scripts.

### Q2. Why is Terraform called a declarative IaC tool?
**Answer**: In Terraform, we declare the **desired end state** (what resources should exist, e.g. a Worker and a KV namespace), and Terraform calculates the necessary actions to achieve that state, unlike imperative tools which require step-by-step commands.

### Q3. What is Terraform State (`terraform.tfstate`)?
**Answer**: Terraform state maps your configuration files to actual real-world resources in Cloudflare and tracks metadata. It allows Terraform to detect changes (drift) and plan updates without destroying unmodified resources.

### Q4. What happens during `terraform init`, `plan`, `apply`, and `destroy`?
- `terraform init`: Initializes working directory, downloads the Cloudflare provider plugin.
- `terraform plan`: Reads current state, compares with desired state, and displays proposed additions (`+`), changes (`~`), or deletions (`-`).
- `terraform apply`: Executes the plan and provisions the real resources on Cloudflare.
- `terraform destroy`: Removes all resources managed by the configuration.

### Q5. What is Infrastructure Drift?
**Answer**: Drift occurs when resources in the real cloud environment are modified manually outside of Terraform (e.g., via the Cloudflare web dashboard). Running `terraform plan` detects the drift and `terraform apply` reconciles it back to the declared configuration.

### Q6. Why use serverless (Cloudflare Workers + KV) for this application?
**Answer**:
1. Zero idle server costs (fits entirely inside Cloudflare's free plan).
2. Instant global edge deployment close to students with low latency.
3. No server maintenance, operating system patching, or virtual machine configuration needed.
