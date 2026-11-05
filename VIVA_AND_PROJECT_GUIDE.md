# MINI PROJECT EVALUATION & VIVA CHEAT SHEET

## 1. Live Deployment Details
- **Live Application URL**: [https://student-task-manager-production.co-2023-asdubey.workers.dev/](https://student-task-manager-production.co-2023-asdubey.workers.dev/)
- **Compute Resource**: Cloudflare Worker (`student-task-manager-production`)
- **Storage Resource**: Cloudflare Workers KV (`student_tasks-production` / ID: `162b466dc15947ae98351c9fc684a78c`)
- **Binding**: `TASKS_KV`
- **Provisioning Engine**: HashiCorp Terraform v1.16.6

---

## 2. Demonstrated CRUD Operations
All 5 required project scenarios are pre-loaded and persisted in Workers KV:
1. `T887B6A`: Prepare Project Presentation [Medium, In Progress]
2. `T96E888`: Attend Project Viva [High, Pending]
3. `TBD2377`: Submit Final Year Project Report [High, Pending]
4. `TE266F0`: Complete Cloud Computing Assignment [High, Pending]
5. `TECD735`: Upload Laboratory Assignment [Low, Completed]

---

## 3. Mandatory Viva Answers (Quick Revision)

### Q1. What is Infrastructure as Code (IaC)?
**Answer**: IaC is the practice of defining, provisioning, and managing cloud infrastructure using machine-readable configuration files (like Terraform's `.tf` files) rather than interactive graphical user interfaces or manual command scripts.

### Q2. Why is Terraform called a declarative IaC tool?
**Answer**: In Terraform, we define the **desired end state** (what resources should exist, e.g. a Worker and a KV namespace), and Terraform calculates the necessary actions to achieve that state, unlike imperative tools which specify *how* to do it step-by-step.

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
