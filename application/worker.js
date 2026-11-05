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

// Built-in Single-Page Web Interface — Cloud-Based Student Task Manager
function getHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cloud-Based Student Task Manager</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #060b18;
      --card-bg: rgba(15, 23, 42, 0.75);
      --card-border: rgba(99, 179, 237, 0.12);
      --text: #e8eef7;
      --text-muted: #7a90b0;
      --primary: #60a5fa;
      --accent: #a78bfa;
      --danger: #fb7185;
      --success: #4ade80;
      --warning: #fbbf24;
      --glow: 0 0 40px rgba(96, 165, 250, 0.08);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', system-ui, sans-serif; }
    body {
      background: var(--bg);
      background-image:
        radial-gradient(ellipse 80% 50% at 20% -10%, rgba(96,165,250,0.12) 0%, transparent 60%),
        radial-gradient(ellipse 60% 40% at 85% 90%, rgba(167,139,250,0.10) 0%, transparent 55%);
      color: var(--text);
      min-height: 100vh;
      padding: 2.5rem 1.25rem 4rem;
    }
    .container { max-width: 920px; margin: 0 auto; }

    /* ── Navbar ── */
    .navbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.75rem 1.25rem;
      background: rgba(15,23,42,0.6);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      backdrop-filter: blur(16px);
      margin-bottom: 2.5rem;
    }
    .nav-logo { font-size: 1rem; font-weight: 800; letter-spacing: -0.03em; }
    .nav-logo span { color: var(--primary); }
    .nav-pill {
      font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
      padding: 0.3rem 0.75rem; border-radius: 9999px;
      background: rgba(96,165,250,0.1); color: var(--primary);
      border: 1px solid rgba(96,165,250,0.25);
    }

    /* ── Hero ── */
    .hero { text-align: center; margin-bottom: 2.5rem; }
    .hero-eyebrow {
      display: inline-flex; align-items: center; gap: 0.4rem;
      font-size: 0.78rem; font-weight: 600; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.08em;
      margin-bottom: 1rem;
    }
    .hero-eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
    h1 {
      font-size: clamp(2rem, 5vw, 3rem);
      font-weight: 900;
      letter-spacing: -0.04em;
      line-height: 1.1;
      margin-bottom: 0.75rem;
      background: linear-gradient(135deg, #fff 30%, var(--primary) 70%, var(--accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .hero-sub { color: var(--text-muted); font-size: 1rem; max-width: 480px; margin: 0 auto 1.5rem; line-height: 1.6; }
    .tech-stack { display: flex; justify-content: center; gap: 0.5rem; flex-wrap: wrap; }
    .tech-tag {
      font-size: 0.72rem; font-weight: 600;
      padding: 0.28rem 0.65rem; border-radius: 6px;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      color: var(--text-muted);
    }

    /* ── Stats ── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.85rem;
      margin-bottom: 1.5rem;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(16px);
      border-radius: 14px;
      padding: 1.25rem 1rem;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .stat-card::before {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(135deg, transparent 60%, rgba(96,165,250,0.04));
    }
    .stat-card h3 { font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
    .stat-card p { font-size: 2rem; font-weight: 800; margin-top: 0.4rem; letter-spacing: -0.04em; }
    #stat-total { color: var(--primary); }
    #stat-pending { color: var(--warning); }
    #stat-completed { color: var(--success); }

    /* ── Cards ── */
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(16px);
      border-radius: 18px;
      padding: 1.5rem;
      margin-bottom: 1.25rem;
      box-shadow: var(--glow);
    }
    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
    .card-header h2 { font-size: 1rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; }
    .card-header h2 .icon { font-size: 1.1rem; }
    .section-line { height: 1px; background: var(--card-border); margin-bottom: 1.25rem; }

    /* ── Form ── */
    .form-grid { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 0.75rem; align-items: end; }
    @media (max-width: 660px) { .form-grid { grid-template-columns: 1fr; } .stats-grid { grid-template-columns: 1fr; } }
    .form-group label { display: block; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.4rem; letter-spacing: 0.03em; }
    input, select {
      width: 100%;
      padding: 0.65rem 0.9rem;
      border-radius: 10px;
      border: 1px solid rgba(99,179,237,0.15);
      background: rgba(5, 10, 24, 0.7);
      color: var(--text);
      font-size: 0.875rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    input::placeholder { color: var(--text-muted); }
    input:focus, select:focus {
      border-color: rgba(96,165,250,0.5);
      box-shadow: 0 0 0 3px rgba(96,165,250,0.1);
    }
    select option { background: #0f172a; }
    .btn-primary {
      width: 100%;
      padding: 0.68rem 1.1rem;
      border-radius: 10px;
      border: none;
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      color: #fff;
      font-size: 0.875rem;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.15s;
      letter-spacing: 0.01em;
    }
    .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
    .btn-primary:active { transform: translateY(0); }

    /* ── Task List ── */
    .task-list { display: flex; flex-direction: column; gap: 0.65rem; }
    .task-item {
      background: rgba(5, 10, 24, 0.5);
      border: 1px solid rgba(99,179,237,0.09);
      border-radius: 12px;
      padding: 0.95rem 1.1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s;
    }
    .task-item:hover {
      border-color: rgba(96,165,250,0.25);
      transform: translateY(-1px);
      box-shadow: 0 4px 20px rgba(96,165,250,0.06);
    }
    .task-info { flex: 1; min-width: 0; }
    .task-id { font-size: 0.7rem; font-family: 'Courier New', monospace; color: var(--primary); font-weight: 700; opacity: 0.8; margin-bottom: 0.2rem; }
    .task-title { font-size: 0.95rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text); }
    .task-meta { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.3rem; }
    .task-date { font-size: 0.7rem; color: var(--text-muted); }
    .status-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

    .pill {
      font-size: 0.68rem; font-weight: 700;
      padding: 0.22rem 0.6rem; border-radius: 6px;
      text-transform: uppercase; letter-spacing: 0.06em;
      flex-shrink: 0;
    }
    .pill.high { background: rgba(251,113,133,0.12); color: #fb7185; border: 1px solid rgba(251,113,133,0.25); }
    .pill.medium { background: rgba(251,191,36,0.12); color: #fbbf24; border: 1px solid rgba(251,191,36,0.25); }
    .pill.low { background: rgba(74,222,128,0.12); color: #4ade80; border: 1px solid rgba(74,222,128,0.25); }

    .task-actions { display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0; }
    .select-status {
      padding: 0.32rem 0.55rem;
      font-size: 0.78rem;
      width: auto;
      background: rgba(5, 10, 24, 0.8);
      border: 1px solid rgba(99,179,237,0.15);
      border-radius: 8px;
      color: var(--text);
      font-family: inherit;
      cursor: pointer;
      outline: none;
    }
    .select-status:focus { border-color: rgba(96,165,250,0.4); }
    .btn-delete {
      background: transparent;
      color: var(--danger);
      border: 1px solid rgba(251,113,133,0.2);
      padding: 0.32rem 0.65rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.78rem;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    .btn-delete:hover { background: rgba(251,113,133,0.15); border-color: rgba(251,113,133,0.4); }
    .btn-refresh {
      padding: 0.32rem 0.75rem;
      font-size: 0.75rem; font-weight: 600; font-family: inherit;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      color: var(--text-muted);
      border-radius: 8px; cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    .btn-refresh:hover { background: rgba(255,255,255,0.08); color: var(--text); }

    /* ── Empty / Footer ── */
    .empty-state {
      text-align: center; padding: 3.5rem 1rem; color: var(--text-muted);
      font-size: 0.9rem; letter-spacing: 0.01em;
    }
    .empty-state .empty-icon { font-size: 2rem; margin-bottom: 0.6rem; }
    footer {
      text-align: center; color: var(--text-muted);
      font-size: 0.78rem; margin-top: 2.5rem;
      border-top: 1px solid var(--card-border);
      padding-top: 1.5rem;
      display: flex; justify-content: center; align-items: center; gap: 0.5rem;
    }
    .footer-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--text-muted); opacity: 0.5; }
  </style>
</head>
<body>
  <div class="container">

    <!-- Navbar -->
    <nav class="navbar">
      <div class="nav-logo">Task<span>Flow</span> IaC</div>
      <span class="nav-pill">🟢 Live on Cloudflare</span>
    </nav>

    <!-- Hero -->
    <section class="hero">
      <div class="hero-eyebrow">
        <span class="dot"></span>
        Serverless &bull; Terraform Provisioned &bull; Workers KV Storage
      </div>
      <h1>Cloud-Based Student<br>Task Manager</h1>
      <p class="hero-sub">
        Manage your academic tasks with a fully serverless application deployed via Infrastructure as Code.
      </p>
      <div class="tech-stack">
        <span class="tech-tag">Terraform v1.16</span>
        <span class="tech-tag">Cloudflare Workers</span>
        <span class="tech-tag">Workers KV</span>
        <span class="tech-tag">GitHub Actions CI/CD</span>
      </div>
    </section>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total Tasks</h3>
        <p id="stat-total">0</p>
      </div>
      <div class="stat-card">
        <h3>Pending</h3>
        <p id="stat-pending">0</p>
      </div>
      <div class="stat-card">
        <h3>Completed</h3>
        <p id="stat-completed">0</p>
      </div>
    </div>

    <!-- Add Task Form -->
    <div class="card">
      <div class="card-header">
        <h2><span class="icon">✏️</span> Add New Task</h2>
      </div>
      <div class="section-line"></div>
      <form id="task-form" onsubmit="createTask(event)">
        <div class="form-grid">
          <div class="form-group">
            <label for="task-title">Task Title</label>
            <input type="text" id="task-title" placeholder="e.g., Submit Cloud Computing Assignment" required />
          </div>
          <div class="form-group">
            <label for="task-priority">Priority</label>
            <select id="task-priority">
              <option value="High">🔴 High</option>
              <option value="Medium" selected>🟡 Medium</option>
              <option value="Low">🟢 Low</option>
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
            <label>&nbsp;</label>
            <button type="submit" class="btn-primary">+ Add Task</button>
          </div>
        </div>
      </form>
    </div>

    <!-- Task List -->
    <div class="card">
      <div class="card-header">
        <h2><span class="icon">📋</span> Task Records</h2>
        <button onclick="loadTasks()" class="btn-refresh">↻ Refresh</button>
      </div>
      <div class="section-line"></div>
      <div id="task-list" class="task-list">
        <div class="empty-state">
          <div class="empty-icon">⏳</div>
          Loading tasks from Workers KV...
        </div>
      </div>
    </div>

    <footer>
      <span>Cloud-Based Student Task Manager</span>
      <span class="footer-dot"></span>
      <span>Powered by Cloudflare Workers &amp; KV</span>
      <span class="footer-dot"></span>
      <span>IaC via Terraform</span>
    </footer>
  </div>

  <script>
    const statusColors = { 'Pending': '#fbbf24', 'In Progress': '#60a5fa', 'Completed': '#4ade80' };

    async function loadTasks() {
      const container = document.getElementById('task-list');
      try {
        const res = await fetch('/api/tasks');
        const tasks = await res.json();

        document.getElementById('stat-total').innerText = tasks.length;
        document.getElementById('stat-pending').innerText = tasks.filter(t => t.status !== 'Completed').length;
        document.getElementById('stat-completed').innerText = tasks.filter(t => t.status === 'Completed').length;

        if (tasks.length === 0) {
          container.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div>No tasks yet. Add your first academic task above!</div>';
          return;
        }

        container.innerHTML = tasks.map(t => {
          const pClass = t.priority ? t.priority.toLowerCase() : 'medium';
          const dotColor = statusColors[t.status] || '#7a90b0';
          return \`
            <div class="task-item">
              <div class="task-info">
                <div class="task-id"># \${t.id}</div>
                <div class="task-title">\${escapeHtml(t.title)}</div>
                <div class="task-meta">
                  <span class="status-dot" style="background:\${dotColor}"></span>
                  <span class="task-date">\${t.status} &bull; Created \${t.createdDate || 'Today'}</span>
                </div>
              </div>
              <span class="pill \${pClass}">\${t.priority}</span>
              <div class="task-actions">
                <select class="select-status" onchange="updateStatus('\${t.id}', this.value)">
                  <option value="Pending" \${t.status === 'Pending' ? 'selected' : ''}>Pending</option>
                  <option value="In Progress" \${t.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                  <option value="Completed" \${t.status === 'Completed' ? 'selected' : ''}>Completed</option>
                </select>
                <button class="btn-delete" onclick="deleteTask('\${t.id}')">✕</button>
              </div>
            </div>
          \`;
        }).join('');
      } catch (err) {
        container.innerHTML = '<div class="empty-state" style="color:#fb7185">⚠️ Failed to connect to API</div>';
      }
    }

    async function createTask(e) {
      e.preventDefault();
      const title = document.getElementById('task-title').value.trim();
      const priority = document.getElementById('task-priority').value;
      const status = document.getElementById('task-status').value;
      if (!title) return;

      const btn = e.target.querySelector('.btn-primary');
      btn.textContent = 'Adding...'; btn.disabled = true;

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority, status })
      });

      btn.textContent = '+ Add Task'; btn.disabled = false;

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
      if (res.ok) loadTasks();
      else alert('Failed to update task status');
    }

    async function deleteTask(id) {
      if (!confirm('Delete this task permanently?')) return;
      const res = await fetch(\`/api/tasks/\${id}\`, { method: 'DELETE' });
      if (res.ok) loadTasks();
      else alert('Failed to delete task');
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

