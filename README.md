# Automated Deployment of a Serverless Student Task Management Application Using Terraform

## 1. Project Overview
This project provisions, deploys, modifies, destroys, and reproduces a complete serverless academic task management system on **Cloudflare Workers** with **Cloudflare Workers KV** persistent storage using **Terraform (Infrastructure as Code)** and automated **GitHub Actions CI/CD**.

No infrastructure components are manually created via web dashboards. The complete lifecycle is declared in HCL (HashiCorp Configuration Language).

---

## 2. Architecture

```text
STUDENT / USER
     │
     ▼ Web Browser
Cloudflare Worker (Serverless Compute & Web Interface)
     │
     ├─► Serves Single Page Application (HTML / CSS / JS)
     ├─► Handles REST API (/api/tasks, /api/tasks/:id)
     ▼
Cloudflare Workers KV (Global Persistent Storage: TASKS_KV)
     │
     ▼ Task Records (JSON)
```

### Infrastructure as Code Pipeline
```text
Local Workspace / Git Push
       │
       ▼
GitHub Repository
       │
       ▼
GitHub Actions CI/CD Pipeline
       │
       ├─► terraform init
       ├─► terraform validate
       ├─► terraform plan
       └─► terraform apply
       │
       ▼
Cloudflare Provider API
 ┌─────┴─────────────────────────┐
 │                               │
 ▼                               ▼
Cloudflare Worker          Cloudflare Workers KV
(student-task-manager)     (student_tasks)
```

---

## 3. Project Directory Structure
```text
student-task-manager-iac/
│
├── terraform/
│   ├── providers.tf            # Terraform settings and Cloudflare provider configuration
│   ├── main.tf                 # Workers KV namespace and Cloudflare Worker script resources
│   ├── variables.tf            # Configurable inputs (account_id, worker_name, environment, etc.)
│   ├── outputs.tf              # Provisioned outputs (worker name, KV namespace ID)
│   └── terraform.tfvars.example # Sample variable definitions template
│
├── application/
│   ├── worker.js               # Cloudflare Worker code (REST API + Embedded UI)
│   ├── index.html              # Frontend user interface
│   ├── style.css               # Modern glassmorphism UI styles
│   └── script.js               # Frontend API client logic
│
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD pipeline
│
├── screenshots/                # Demonstration and evaluation screenshots
├── .gitignore                  # Git exclusions for secrets, state, and cache
└── README.md                   # Complete documentation
```

---

## 4. REST API Specification

| Method | Endpoint | Description | Example Request Body |
|---|---|---|---|
| **POST** | `/api/tasks` | Create new academic task | `{"title": "Complete Cloud Assignment", "priority": "High", "status": "Pending"}` |
| **GET** | `/api/tasks` | Fetch all student tasks | _None_ |
| **GET** | `/api/tasks/{id}` | Fetch specific task by ID | _None_ |
| **PUT** | `/api/tasks/{id}` | Update task status or priority | `{"status": "Completed"}` |
| **DELETE** | `/api/tasks/{id}` | Delete task record | _None_ |

---

## 5. Local Setup & Terraform Lifecycle Demonstration

### Prerequisites
- [Terraform](https://developer.hashicorp.com/terraform/install) (v1.6.0+)
- [Git](https://git-scm.com/)
- Cloudflare Account & API Token (Permissions: `Workers Scripts: Edit`, `Workers KV Storage: Edit`)

### Step 1: Configure Credentials
In `terraform/`, copy the example file:
```bash
cp terraform.tfvars.example terraform.tfvars
```
Provide your Cloudflare Account ID and API Token in `terraform.tfvars` (this file is git-ignored):
```hcl
cloudflare_account_id = "your_cloudflare_account_id"
cloudflare_api_token  = "your_cloudflare_api_token"
worker_name           = "student-task-manager"
kv_namespace_name     = "student_tasks"
environment           = "production"
```

### Step 2: Initialize Terraform
```bash
cd terraform
terraform init
```

### Step 3: Format and Validate
```bash
terraform fmt
terraform validate
```

### Step 4: Generate Execution Plan
```bash
terraform plan
```
Terraform will plan the creation of:
- `+ cloudflare_workers_kv_namespace.student_tasks`
- `+ cloudflare_worker_script.student_task_manager` with `TASKS_KV` binding

### Step 5: Provision Infrastructure
```bash
terraform apply
```
Type `yes` when prompted. Terraform outputs the provisioned resource identifiers.

### Step 6: Test Application and CRUD Operations
- Access the worker URL or test endpoints via curl:
```bash
# Add Task
curl -X POST https://<worker-subdomain>.workers.dev/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Submit Cloud Computing Assignment", "priority": "High", "status": "Pending"}'

# List Tasks
curl https://<worker-subdomain>.workers.dev/api/tasks
```

### Step 7: Modify Infrastructure (IaC Experiment)
Change `environment = "dev"` or modify a tag in `variables.tf` / `terraform.tfvars`, then run:
```bash
terraform plan
terraform apply
```

### Step 8: Destroy and Recreate Infrastructure
```bash
# Destroy all cloud resources
terraform destroy

# Recreate completely from code without manual intervention
terraform apply
```

---

## 6. CI/CD with GitHub Actions
1. Push repository to GitHub.
2. In GitHub repository, go to **Settings** > **Secrets and variables** > **Actions**.
3. Add Repository Secrets:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`
4. Any push to `main` triggers `.github/workflows/deploy.yml` which validates, plans, and automatically applies the infrastructure changes.

