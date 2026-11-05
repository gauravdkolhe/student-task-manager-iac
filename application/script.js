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
      return `
        <div class="task-item">
          <div class="task-info">
            <div class="task-id">${t.id}</div>
            <div class="task-title">${escapeHtml(t.title)}</div>
            <div class="task-date">Created: ${t.createdDate || 'Today'}</div>
          </div>
          <span class="pill ${pClass}">${t.priority}</span>
          <div class="task-actions">
            <select class="select-status" onchange="updateStatus('${t.id}', this.value)">
              <option value="Pending" ${t.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="In Progress" ${t.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option value="Completed" ${t.status === 'Completed' ? 'selected' : ''}>Completed</option>
            </select>
            <button class="btn-delete" onclick="deleteTask('${t.id}')">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state" style="color: var(--danger)">Failed to load tasks from API</div>';
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
  const res = await fetch(`/api/tasks/${id}`, {
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
  const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
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

