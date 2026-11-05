// Cloudflare Worker for Student Task Management System
// Serves UI and provides REST API with Cloudflare Workers KV persistent storage

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    "access-control-allow-headers": "Content-Type"
  }
});

const key = (id) => `task:${id}`;
const PRIORITIES = new Set(["High", "Medium", "Low"]);
const STATUSES = new Set(["Pending", "In Progress", "Completed"]);

async function listTasks(env) {
  const names = [];
  let cursor;
  do {
    const listed = await env.TASKS_KV.list({ prefix: "task:", cursor });
    names.push(...listed.keys.map(({ name }) => name));
    cursor = listed.list_complete ? undefined : listed.cursor;
  } while (cursor);

  const tasks = await Promise.all(names.map((name) => env.TASKS_KV.get(name, "json")));
  return tasks.filter(Boolean).sort((a, b) => b.createdDate.localeCompare(a.createdDate));
}

async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

function validateInput(input, partial = false) {
  if (!input) return "Request body must be valid JSON.";
  if (!partial && (typeof input.title !== "string" || !input.title.trim())) return "Task title is required.";
  if (input.title !== undefined && (typeof input.title !== "string" || !input.title.trim() || input.title.trim().length > 120)) {
    return "Task title must be between 1 and 120 characters.";
  }
  if (input.priority !== undefined && !PRIORITIES.has(input.priority)) {
    return "Priority must be High, Medium, or Low.";
  }
  if (input.status !== undefined && !STATUSES.has(input.status)) {
    return "Status must be Pending, In Progress, or Completed.";
  }
  return null;
}

async function handleApi(request, env, url) {
  if (request.method === "OPTIONS") {
    return json({ ok: true }, 204);
  }

  // Route: /api/tasks or /api/tasks/{id}
  const parts = url.pathname.split("/").filter(Boolean);
  const id = parts[2]; // /api/tasks/:id

  // GET /api/tasks - Retrieve all tasks
  if (request.method === "GET" && !id) {
    return json(await listTasks(env));
  }

  // GET /api/tasks/{id} - Retrieve individual task
  if (request.method === "GET" && id) {
    const task = await env.TASKS_KV.get(key(id), "json");
    return task ? json(task) : json({ message: "Task not found" }, 404);
  }

  // POST /api/tasks - Create task
  if (request.method === "POST") {
    const input = await readJson(request);
    const error = validateInput(input);
    if (error) return json({ message: error }, 400);

    const task = {
      id: `T${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      title: input.title.trim(),
      priority: input.priority || "Medium",
      status: input.status || "Pending",
      createdDate: new Date().toISOString().slice(0, 10)
    };

    await env.TASKS_KV.put(key(task.id), JSON.stringify(task));
    return json(task, 201);
  }

  // PUT /api/tasks/{id} - Update task
  if (request.method === "PUT") {
    if (!id) return json({ message: "Task ID is required in URL" }, 400);
    const existing = await env.TASKS_KV.get(key(id), "json");
    if (!existing) return json({ message: "Task not found" }, 404);

    const input = await readJson(request);
    const error = validateInput(input, true);
    if (error) return json({ message: error }, 400);

    const task = {
      ...existing,
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      id: existing.id,
      createdDate: existing.createdDate
    };

    await env.TASKS_KV.put(key(id), JSON.stringify(task));
    return json(task);
  }

  // DELETE /api/tasks/{id} - Delete task
  if (request.method === "DELETE") {
    if (!id) return json({ message: "Task ID is required in URL" }, 400);
    await env.TASKS_KV.delete(key(id));
    return json({ message: "Task deleted successfully", id });
  }

  return json({ message: "Method not allowed" }, 405);
}

// Built-in Single-Page Web Interface
function getHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Student Task Manager - Cloudflare IaC</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: rgba(30, 41, 59, 0.7);
      --card-border: rgba(255, 255, 255, 0.1);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --primary-hover: #0ea5e9;
      --accent: #818cf8;
      --danger: #f87171;
      --success: #34d399;
      --warning: #fbbf24;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body {
      background: radial-gradient(circle at top, #1e293b 0%, #0f172a 100%);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem 1rem;
    }
    .container { max-width: 900px; margin: 0 auto; }
    header { text-align: center; margin-bottom: 2rem; }
    .badge {
      display: inline-block;
      background: rgba(56, 189, 248, 0.15);
      color: var(--primary);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 0.35rem 0.8rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 0.8rem;
    }
    h1 { font-size: 2.2rem; font-weight: 800; margin-bottom: 0.4rem; background: linear-gradient(135deg, #fff 40%, var(--primary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    header p { color: var(--text-muted); font-size: 0.95rem; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(12px);
      border-radius: 14px;
      padding: 1.2rem;
      text-align: center;
    }
    .stat-card h3 { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
    .stat-card p { font-size: 1.8rem; font-weight: 800; margin-top: 0.3rem; color: var(--primary); }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(12px);
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    .card h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; }
    .form-grid { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 0.75rem; align-items: end; }
    @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
    .form-group label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.3rem; }
    input, select, button {
      width: 100%;
      padding: 0.7rem 0.9rem;
      border-radius: 10px;
      border: 1px solid var(--card-border);
      background: rgba(15, 23, 42, 0.8);
      color: var(--text);
      font-size: 0.9rem;
      outline: none;
      transition: all 0.2s;
    }
    input:focus, select:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2); }
    button.btn-primary {
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: #0f172a;
      font-weight: 700;
      border: none;
      cursor: pointer;
    }
    button.btn-primary:hover { opacity: 0.95; transform: translateY(-1px); }
    .task-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .task-item {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1rem 1.2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      transition: all 0.2s;
    }
    .task-item:hover { border-color: rgba(56, 189, 248, 0.3); transform: translateY(-1px); }
    .task-info { flex: 1; }
    .task-id { font-size: 0.75rem; font-family: monospace; color: var(--primary); font-weight: 700; }
    .task-title { font-size: 1rem; font-weight: 600; margin: 0.2rem 0; }
    .task-date { font-size: 0.75rem; color: var(--text-muted); }
    .pill {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .pill.high { background: rgba(248, 113, 113, 0.15); color: var(--danger); border: 1px solid rgba(248, 113, 113, 0.3); }
    .pill.medium { background: rgba(251, 191, 36, 0.15); color: var(--warning); border: 1px solid rgba(251, 191, 36, 0.3); }
    .pill.low { background: rgba(52, 211, 153, 0.15); color: var(--success); border: 1px solid rgba(52, 211, 153, 0.3); }
    .task-actions { display: flex; gap: 0.5rem; align-items: center; }
    .select-status {
      padding: 0.35rem 0.6rem;
      font-size: 0.8rem;
      width: auto;
      background: rgba(30, 41, 59, 0.9);
      border-radius: 8px;
    }
    .btn-delete {
      background: rgba(248, 113, 113, 0.15);
      color: var(--danger);
      border: 1px solid rgba(248, 113, 113, 0.3);
      padding: 0.4rem 0.75rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.8rem;
      cursor: pointer;
      width: auto;
    }
    .btn-delete:hover { background: var(--danger); color: #fff; }
    .empty-state { text-align: center; padding: 3rem 1rem; color: var(--text-muted); }
    footer { text-align: center; color: var(--text-muted); font-size: 0.85rem; margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <span class="badge">Infrastructure as Code &bull; Cloudflare Workers + KV</span>
      <h1>Student Task Manager</h1>
      <p>Automated Serverless Architecture Provisioned by Terraform</p>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total Tasks</h3>
        <p id="stat-total">0</p>
      </div>
      <div class="stat-card">
        <h3>Pending</h3>
        <p id="stat-pending" style="color: var(--warning)">0</p>
      </div>
      <div class="stat-card">
        <h3>Completed</h3>
        <p id="stat-completed" style="color: var(--success)">0</p>
      </div>
    </div>

    <div class="card">
      <h2>Add New Student Task</h2>
      <form id="task-form" onsubmit="createTask(event)">
        <div class="form-grid">
          <div class="form-group">
            <label for="task-title">Task Title</label>
            <input type="text" id="task-title" placeholder="e.g., Submit Cloud Computing Assignment" required />
          </div>
          <div class="form-group">
            <label for="task-priority">Priority</label>
            <select id="task-priority">
              <option value="High">High</option>
              <option value="Medium" selected>Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div class="form-group">
            <label for="task-status">Status</label>
            <select id="task-status">
              <option value="Pending" selected>Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div class="form-group">
            <button type="submit" class="btn-primary">Add Task</button>
          </div>
        </div>
      </form>
    </div>

    <div class="card">
      <h2>
        <span>Task Records</span>
        <button onclick="loadTasks()" style="width: auto; padding: 0.35rem 0.8rem; font-size: 0.8rem; background: rgba(255,255,255,0.05); cursor: pointer;">Refresh</button>
      </h2>
      <div id="task-list" class="task-list">
        <div class="empty-state">Loading tasks from Workers KV...</div>
      </div>
    </div>

    <footer>
      Student Task Management Application &bull; Terraform IaC Project
    </footer>
  </div>

  <script>
    async function loadTasks() {
      const container = document.getElementById('task-list');
      try {
        const res = await fetch('/api/tasks');
        const tasks = await res.json();
        
        let total = tasks.length;
        let pending = 0;
        let completed = 0;

        tasks.forEach(t => {
          if (t.status === 'Completed') completed++;
          else pending++;
        });

        document.getElementById('stat-total').innerText = total;
        document.getElementById('stat-pending').innerText = pending;
        document.getElementById('stat-completed').innerText = completed;

        if (tasks.length === 0) {
          container.innerHTML = '<div class="empty-state">No academic tasks found. Add a task above!</div>';
          return;
        }

        container.innerHTML = tasks.map(t => {
          const pClass = t.priority ? t.priority.toLowerCase() : 'medium';
          return \`
            <div class="task-item">
              <div class="task-info">
                <div class="task-id">\${t.id}</div>
                <div class="task-title">\${escapeHtml(t.title)}</div>
                <div class="task-date">Created: \${t.createdDate || 'Today'}</div>
              </div>
              <span class="pill \${pClass}">\${t.priority}</span>
              <div class="task-actions">
                <select class="select-status" onchange="updateStatus('\${t.id}', this.value)">
                  <option value="Pending" \${t.status === 'Pending' ? 'selected' : ''}>Pending</option>
                  <option value="In Progress" \${t.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                  <option value="Completed" \${t.status === 'Completed' ? 'selected' : ''}>Completed</option>
                </select>
                <button class="btn-delete" onclick="deleteTask('\${t.id}')">Delete</button>
              </div>
            </div>
          \`;
        }).join('');
      } catch (err) {
        container.innerHTML = '<div class="empty-state" style="color: var(--danger)">Failed to connect to API</div>';
      }
    }

    async function createTask(e) {
      e.preventDefault();
      const title = document.getElementById('task-title').value.trim();
      const priority = document.getElementById('task-priority').value;
      const status = document.getElementById('task-status').value;
      if (!title) return;

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority, status })
      });

      if (res.ok) {
        document.getElementById('task-title').value = '';
        loadTasks();
      } else {
        const data = await res.json();
        alert(data.message || 'Error creating task');
      }
    }

    async function updateStatus(id, newStatus) {
      const res = await fetch(\`/api/tasks/\${id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        loadTasks();
      } else {
        alert('Failed to update task status');
      }
    }

    async function deleteTask(id) {
      if (!confirm('Are you sure you want to delete this task?')) return;
      const res = await fetch(\`/api/tasks/\${id}\`, { method: 'DELETE' });
      if (res.ok) {
        loadTasks();
      } else {
        alert('Failed to delete task');
      }
    }

    function escapeHtml(text) {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return text.replace(/[&<>"']/g, m => map[m]);
    }

    loadTasks();
  </script>
</body>
</html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API requests
    if (url.pathname === "/api/tasks" || url.pathname.startsWith("/api/tasks/")) {
      return await handleApi(request, env, url);
    }

    // Single-Page UI request
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(getHtml(), {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-cache"
        }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};

