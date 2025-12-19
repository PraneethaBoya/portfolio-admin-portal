(() => {
  const cfg = (window.ADMIN_CONFIG || {});
  const API_BASE = (cfg.API_BASE_URL || '').replace(/\/$/, '');

  function apiUrl(path) {
    if (!API_BASE) return path;
    return API_BASE + path;
  }

  async function apiFetch(path, options = {}) {
    const response = await fetch(apiUrl(path), {
      credentials: 'include',
      ...options
    });
    if (response.status === 401) {
      showNotification('Your session has expired. Redirecting to login…', 'error');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1200);
      return response;
    }
    return response;
  }

  async function readJsonSafe(response) {
    try {
      return await response.json();
    } catch (_) {
      return null;
    }
  }

  function getApiErrorMessage(response, data, fallback) {
    if (data && typeof data.error === 'string' && data.error.trim()) return data.error;
    if (response && typeof response.status === 'number' && response.status) {
      return `${fallback} (HTTP ${response.status})`;
    }
    return fallback;
  }

  function formatDateTimeIST(value) {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    setTimeout(() => notification.classList.remove('show'), 3000);
  }

  function showModal(title, formHTML) {
    const modal = document.getElementById('modal');
    if (!modal) return;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-form').innerHTML = formHTML;
    const modalForm = document.getElementById('modal-form');
    if (modalForm) {
      modalForm.onsubmit = (e) => {
        e.preventDefault();
      };
    }
    modal.classList.add('active');
  }

  function closeModal() {
    const modal = document.getElementById('modal');
    if (!modal) return;
    modal.classList.remove('active');
  }

  async function checkAuth() {
    const response = await apiFetch('/api/auth/check');
    const data = await response.json();
    if (!data.isAuthenticated) {
      window.location.href = 'login.html';
    }
  }

  async function loadDashboardStats() {
    try {
      const [skills, projects, experience, blogs, education, messages] = await Promise.all([
        apiFetch('/api/skills').then(r => r.json()),
        apiFetch('/api/projects').then(r => r.json()),
        apiFetch('/api/experience').then(r => r.json()),
        apiFetch('/api/blogs').then(r => r.json()),
        apiFetch('/api/education').then(r => r.json()),
        apiFetch('/api/messages').then(r => r.json())
      ]);

      const setCount = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(value);
      };

      setCount('skills-count', Array.isArray(skills) ? skills.length : 0);
      setCount('projects-count', Array.isArray(projects) ? projects.length : 0);
      setCount('experience-count', Array.isArray(experience) ? experience.length : 0);
      setCount('blogs-count', Array.isArray(blogs) ? blogs.length : 0);
      setCount('education-count', Array.isArray(education) ? education.length : 0);
      setCount('messages-count', Array.isArray(messages) ? messages.filter(m => !m.read).length : 0);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadProfile() {
    try {
      const response = await apiFetch('/api/profile');
      const profile = await response.json();

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
      };

      setVal('profile-name', profile.name);
      setVal('profile-role', profile.role);
      setVal('profile-bio', profile.bio);
      setVal('profile-email', profile.email);
      setVal('profile-phone', profile.phone);
      setVal('profile-location', profile.location);
      setVal('profile-github', profile.github || '');
      setVal('profile-linkedin', profile.linkedin || '');

      const preview = document.getElementById('profile-image-preview');
      if (preview) preview.src = profile.image ? apiUrl(profile.image) : '';

      const resumeLink = document.getElementById('profile-resume-link');
      if (resumeLink) {
        if (profile.resume) {
          resumeLink.href = apiUrl(profile.resume);
          resumeLink.style.display = '';
        } else {
          resumeLink.href = '#';
          resumeLink.style.display = 'none';
        }
      }
    } catch (e) {
      showNotification('Couldn\'t load your profile right now. Please refresh and try again.', 'error');
    }
  }

  async function loadSkills() {
    try {
      const response = await apiFetch('/api/skills');
      const skills = await response.json();
      const list = document.getElementById('skills-list');
      if (!list) return;
      list.innerHTML = (Array.isArray(skills) ? skills : []).map(skill => `
        <div class="item-card">
          <div class="item-info">
            <h3>${skill.name || ''}</h3>
            <p>Level: ${skill.level || 0}%</p>
            <div class="item-meta"><span class="badge badge-primary">${skill.category || ''}</span></div>
          </div>
          <div class="item-actions">
            <button class="btn-icon btn-edit" onclick="window.editSkill('${skill.id}')">✏️</button>
            <button class="btn-icon btn-delete" onclick="window.deleteSkill('${skill.id}')">🗑️</button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      showNotification('Couldn\'t load skills. Please try again.', 'error');
    }
  }

  async function loadProjects() {
    try {
      const response = await apiFetch('/api/projects');
      const projects = await response.json();
      const list = document.getElementById('projects-list');
      if (!list) return;
      list.innerHTML = (Array.isArray(projects) ? projects : []).map(project => `
        <div class="item-card">
          <div class="item-info">
            <h3>${project.title || ''}</h3>
            <p>${project.description || ''}</p>
            <div class="item-meta">
              ${(Array.isArray(project.techStack) ? project.techStack : []).map(t => `<span class="badge badge-primary">${t}</span>`).join('')}
            </div>
          </div>
          <div class="item-actions">
            <button class="btn-icon btn-edit" onclick="window.editProject('${project.id}')">✏️</button>
            <button class="btn-icon btn-delete" onclick="window.deleteProject('${project.id}')">🗑️</button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      showNotification('Couldn\'t load projects. Please try again.', 'error');
    }
  }

  async function loadExperience() {
    try {
      const response = await apiFetch('/api/experience');
      const items = await response.json();
      const list = document.getElementById('experience-list');
      if (!list) return;
      list.innerHTML = (Array.isArray(items) ? items : []).map(exp => `
        <div class="item-card">
          <div class="item-info">
            <h3>${exp.title || ''}</h3>
            <p><strong>${exp.company || ''}</strong>${exp.location ? ` - ${exp.location}` : ''}</p>
            <p>${exp.description || ''}</p>
            <div class="item-meta">
              <span class="badge badge-${exp.current ? 'success' : 'gray'}">${exp.startDate || ''} - ${exp.current ? 'Present' : (exp.endDate || '')}</span>
            </div>
          </div>
          <div class="item-actions">
            <button class="btn-icon btn-edit" onclick="window.editExperience('${exp.id}')">✏️</button>
            <button class="btn-icon btn-delete" onclick="window.deleteExperience('${exp.id}')">🗑️</button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      showNotification('Couldn\'t load experience entries. Please try again.', 'error');
    }
  }

  async function loadBlogs() {
    try {
      const response = await apiFetch('/api/blogs');
      const items = await response.json();
      const list = document.getElementById('blogs-list');
      if (!list) return;
      list.innerHTML = (Array.isArray(items) ? items : []).map(b => `
        <div class="item-card">
          <div class="item-info">
            <h3>${b.title || ''}</h3>
            <p>${b.excerpt || ''}</p>
            <div class="item-meta">
              ${(Array.isArray(b.tags) ? b.tags : []).map(t => `<span class="badge badge-primary">${t}</span>`).join('')}
              <span class="badge badge-gray">${b.date || ''}</span>
            </div>
          </div>
          <div class="item-actions">
            <button class="btn-icon btn-edit" onclick="window.editBlog('${b.id}')">✏️</button>
            <button class="btn-icon btn-delete" onclick="window.deleteBlog('${b.id}')">🗑️</button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      showNotification('Couldn\'t load blog posts. Please try again.', 'error');
    }
  }

  async function loadEducation() {
    try {
      const response = await apiFetch('/api/education');
      const items = await response.json();
      const list = document.getElementById('education-list');
      if (!list) return;
      list.innerHTML = (Array.isArray(items) ? items : []).map(ed => `
        <div class="item-card">
          <div class="item-info">
            <h3>${ed.degree || ''}${ed.field ? ` - ${ed.field}` : ''}</h3>
            <p><strong>${ed.institution || ''}</strong>${ed.location ? ` • ${ed.location}` : ''}</p>
            <p>${ed.description || ''}</p>
            <div class="item-meta"><span class="badge badge-gray">${ed.startDate || ''}${ed.endDate ? ` - ${ed.endDate}` : ''}</span></div>
          </div>
          <div class="item-actions">
            <button class="btn-icon btn-edit" onclick="window.editEducation('${ed.id}')">✏️</button>
            <button class="btn-icon btn-delete" onclick="window.deleteEducation('${ed.id}')">🗑️</button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      showNotification('Couldn\'t load education entries. Please try again.', 'error');
    }
  }

  async function loadMessages() {
    try {
      const response = await apiFetch('/api/messages');
      const messages = await response.json();
      const list = document.getElementById('messages-list');
      if (!list) return;

      list.innerHTML = (Array.isArray(messages) ? messages : []).map(m => {
        const badgeClass = m.read ? 'badge-gray' : 'badge-success';
        const badgeText = m.read ? 'Read' : 'New';
        const dateText = m.createdAt ? formatDateTimeIST(m.createdAt) : '';
        const subject = m.subject ? m.subject : 'No subject';
        const preview = (m.message || '').slice(0, 90);
        return `
          <div class="item-card">
            <div class="item-info">
              <h3>${subject}</h3>
              <p><strong>${m.name || ''}</strong> • ${m.email || ''}</p>
              <p>${preview}${(m.message || '').length > 90 ? '…' : ''}</p>
              <div class="item-meta">
                <span class="badge ${badgeClass}">${badgeText}</span>
                <span class="badge badge-gray">${dateText}</span>
              </div>
            </div>
            <div class="item-actions">
              <button class="btn-icon btn-edit" onclick="window.viewMessage('${m.id}')">👁️</button>
              <button class="btn-icon btn-edit" onclick="window.toggleMessageRead('${m.id}', ${m.read ? 'true' : 'false'})">${m.read ? '📩' : '✅'}</button>
              <button class="btn-icon btn-delete" onclick="window.deleteMessage('${m.id}')">🗑️</button>
            </div>
          </div>
        `;
      }).join('');

      loadDashboardStats();
    } catch (e) {
      showNotification('Couldn\'t load messages. Please try again.', 'error');
    }
  }

  window.editSkill = async (id) => {
    const response = await apiFetch('/api/skills');
    const skills = await response.json();
    const skill = (Array.isArray(skills) ? skills : []).find(s => s.id === id);
    if (!skill) return;
    showModal('Edit Skill', `
      <div class="form-group"><label>Skill Name</label><input type="text" id="skill-name" value="${skill.name || ''}" required></div>
      <div class="form-group"><label>Category</label><input type="text" id="skill-category" value="${skill.category || ''}" required></div>
      <div class="form-group"><label>Level (%)</label><input type="number" id="skill-level" value="${skill.level || 0}" min="0" max="100" required></div>
      <button type="submit" class="btn-primary" onclick="window.saveSkill('${id}')">Update Skill</button>
    `);
  };

  window.saveSkill = async (id = null) => {
    try {
      const skillData = {
        name: document.getElementById('skill-name').value,
        category: document.getElementById('skill-category').value,
        level: Number.parseInt(document.getElementById('skill-level').value, 10)
      };
      const url = id ? `/api/skills/${id}` : '/api/skills';
      const method = id ? 'PUT' : 'POST';
      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skillData)
      });
      const data = await readJsonSafe(response);
      if (data && data.success) {
        showNotification(`Skill ${id ? 'updated' : 'added'} — saved.`, 'success');
        closeModal();
        loadSkills();
        loadDashboardStats();
      } else {
        showNotification(getApiErrorMessage(response, data, 'Couldn\'t save that skill. Please try again.'), 'error');
      }
    } catch (e) {
      showNotification('Couldn\'t reach the server. Please try again.', 'error');
    }
  };

  window.deleteSkill = async (id) => {
    if (!confirm('Delete this skill? This can\'t be undone.')) return;
    try {
      const response = await apiFetch(`/api/skills/${id}`, { method: 'DELETE' });
      const data = await readJsonSafe(response);
      if (data && data.success) {
        showNotification('Skill deleted.', 'success');
        loadSkills();
        loadDashboardStats();
      } else {
        showNotification(getApiErrorMessage(response, data, 'Couldn\'t delete that skill. Please try again.'), 'error');
      }
    } catch (e) {
      showNotification('Couldn\'t reach the server. Please try again.', 'error');
    }
  };

  window.editProject = async (id) => {
    const response = await apiFetch('/api/projects');
    const projects = await response.json();
    const project = (Array.isArray(projects) ? projects : []).find(p => p.id === id);
    if (!project) return;
    showModal('Edit Project', `
      <div class="form-group"><label>Project Title</label><input type="text" id="project-title" value="${project.title || ''}" required></div>
      <div class="form-group"><label>Description</label><textarea id="project-description" rows="3" required>${project.description || ''}</textarea></div>
      <div class="form-group"><label>Tech Stack (comma-separated)</label><input type="text" id="project-techstack" value="${(Array.isArray(project.techStack) ? project.techStack : []).join(', ')}" required></div>
      <div class="form-group"><label>Date</label><input type="month" id="project-date" value="${project.date || ''}" required></div>
      <button type="submit" class="btn-primary" onclick="window.saveProject('${id}')">Update Project</button>
    `);
  };

  window.saveProject = async (id = null) => {
    try {
      const formData = new FormData();
      formData.append('title', document.getElementById('project-title').value);
      formData.append('description', document.getElementById('project-description').value);
      formData.append('techStack', JSON.stringify(document.getElementById('project-techstack').value.split(',').map(t => t.trim()).filter(Boolean)));
      formData.append('date', document.getElementById('project-date').value);
      const url = id ? `/api/projects/${id}` : '/api/projects';
      const method = id ? 'PUT' : 'POST';
      const response = await apiFetch(url, { method, body: formData });
      const data = await readJsonSafe(response);
      if (data && data.success) {
        showNotification(`Project ${id ? 'updated' : 'added'} — saved.`, 'success');
        closeModal();
        loadProjects();
        loadDashboardStats();
      } else {
        showNotification(getApiErrorMessage(response, data, 'Couldn\'t save that project. Please try again.'), 'error');
      }
    } catch (e) {
      showNotification('Couldn\'t reach the server. Please try again.', 'error');
    }
  };

  window.deleteProject = async (id) => {
    if (!confirm('Delete this project? This can\'t be undone.')) return;
    try {
      const response = await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
      const data = await readJsonSafe(response);
      if (data && data.success) {
        showNotification('Project deleted.', 'success');
        loadProjects();
        loadDashboardStats();
      } else {
        showNotification(getApiErrorMessage(response, data, 'Couldn\'t delete that project. Please try again.'), 'error');
      }
    } catch (e) {
      showNotification('Couldn\'t reach the server. Please try again.', 'error');
    }
  };

  window.editExperience = async (id) => {
    const response = await apiFetch('/api/experience');
    const experience = await response.json();
    const exp = (Array.isArray(experience) ? experience : []).find(x => x.id === id);
    if (!exp) return;
    const achievements = Array.isArray(exp.achievements) ? exp.achievements.join(', ') : '';
    showModal('Edit Experience', `
      <div class="form-group"><label>Job Title</label><input type="text" id="exp-title" value="${exp.title || ''}" required></div>
      <div class="form-group"><label>Company</label><input type="text" id="exp-company" value="${exp.company || ''}" required></div>
      <div class="form-group"><label>Location</label><input type="text" id="exp-location" value="${exp.location || ''}" required></div>
      <div class="form-row">
        <div class="form-group"><label>Start Date</label><input type="month" id="exp-startdate" value="${exp.startDate || ''}" required></div>
        <div class="form-group"><label>End Date</label><input type="month" id="exp-enddate" value="${exp.endDate || ''}"></div>
      </div>
      <div class="form-group"><label><input type="checkbox" id="exp-current" ${exp.current ? 'checked' : ''}> Currently Working Here</label></div>
      <div class="form-group"><label>Description</label><textarea id="exp-description" rows="3">${exp.description || ''}</textarea></div>
      <div class="form-group"><label>Achievements (comma-separated)</label><input type="text" id="exp-achievements" value="${achievements}"></div>
      <button type="submit" class="btn-primary" onclick="window.saveExperience('${id}')">Update Experience</button>
    `);
  };

  window.saveExperience = async (id = null) => {
    try {
      const payload = {
        title: document.getElementById('exp-title').value,
        company: document.getElementById('exp-company').value,
        location: document.getElementById('exp-location').value,
        startDate: document.getElementById('exp-startdate').value,
        endDate: document.getElementById('exp-enddate').value,
        current: !!document.getElementById('exp-current').checked,
        description: document.getElementById('exp-description').value,
        achievements: document.getElementById('exp-achievements').value.split(',').map(x => x.trim()).filter(Boolean)
      };
      if (payload.current) payload.endDate = '';
      const url = id ? `/api/experience/${id}` : '/api/experience';
      const method = id ? 'PUT' : 'POST';
      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, achievements: JSON.stringify(payload.achievements) })
      });
      const data = await readJsonSafe(response);
      if (data && data.success) {
        showNotification(`Experience ${id ? 'updated' : 'added'} — saved.`, 'success');
        closeModal();
        loadExperience();
        loadDashboardStats();
      } else {
        showNotification(getApiErrorMessage(response, data, 'Couldn\'t save that experience entry. Please try again.'), 'error');
      }
    } catch (e) {
      showNotification('Couldn\'t reach the server. Please try again.', 'error');
    }
  };

  window.deleteExperience = async (id) => {
    if (!confirm('Delete this experience entry? This can\'t be undone.')) return;
    try {
      const response = await apiFetch(`/api/experience/${id}`, { method: 'DELETE' });
      const data = await readJsonSafe(response);
      if (data && data.success) {
        showNotification('Experience entry deleted.', 'success');
        loadExperience();
        loadDashboardStats();
      } else {
        showNotification(getApiErrorMessage(response, data, 'Couldn\'t delete that experience entry. Please try again.'), 'error');
      }
    } catch (e) {
      showNotification('Couldn\'t reach the server. Please try again.', 'error');
    }
  };

  window.editBlog = async (id) => {
    const response = await apiFetch('/api/blogs');
    const blogs = await response.json();
    const blog = (Array.isArray(blogs) ? blogs : []).find(x => x.id === id);
    if (!blog) return;
    showModal('Edit Blog', `
      <div class="form-group"><label>Title</label><input type="text" id="blog-title" value="${blog.title || ''}" required></div>
      <div class="form-group"><label>Excerpt</label><input type="text" id="blog-excerpt" value="${blog.excerpt || ''}"></div>
      <div class="form-group"><label>Content</label><textarea id="blog-content" rows="6" required>${blog.content || ''}</textarea></div>
      <div class="form-group"><label>Date</label><input type="date" id="blog-date" value="${blog.date || ''}"></div>
      <div class="form-group"><label>Tags (comma-separated)</label><input type="text" id="blog-tags" value="${(Array.isArray(blog.tags) ? blog.tags : []).join(', ')}"></div>
      <div class="form-group"><label>Image</label><input type="file" id="blog-image" accept="image/*"></div>
      <button type="submit" class="btn-primary" onclick="window.saveBlog('${id}')">Update Blog</button>
    `);
  };

  window.saveBlog = async (id = null) => {
    try {
      const formData = new FormData();
      formData.append('title', document.getElementById('blog-title').value);
      formData.append('excerpt', document.getElementById('blog-excerpt').value);
      formData.append('content', document.getElementById('blog-content').value);
      formData.append('date', document.getElementById('blog-date').value);
      formData.append('tags', JSON.stringify(document.getElementById('blog-tags').value.split(',').map(t => t.trim()).filter(Boolean)));
      const img = document.getElementById('blog-image');
      if (img && img.files && img.files[0]) formData.append('image', img.files[0]);

      const url = id ? `/api/blogs/${id}` : '/api/blogs';
      const method = id ? 'PUT' : 'POST';
      const response = await apiFetch(url, { method, body: formData });
      const data = await response.json();
      if (data.success) {
        showNotification(`Blog ${id ? 'updated' : 'added'} — saved.`, 'success');
        closeModal();
        loadBlogs();
        loadDashboardStats();
      } else {
        showNotification(data.error || 'Couldn\'t save that blog post. Please try again.', 'error');
      }
    } catch (e) {
      showNotification('Couldn\'t reach the server. Please try again.', 'error');
    }
  };

  window.deleteBlog = async (id) => {
    if (!confirm('Delete this blog post? This can\'t be undone.')) return;
    try {
      const response = await apiFetch(`/api/blogs/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        showNotification('Blog post deleted.', 'success');
        loadBlogs();
        loadDashboardStats();
      } else {
        showNotification(data.error || 'Couldn\'t delete that blog post. Please try again.', 'error');
      }
    } catch (e) {
      showNotification('Couldn\'t reach the server. Please try again.', 'error');
    }
  };

  window.editEducation = async (id) => {
    const response = await apiFetch('/api/education');
    const education = await response.json();
    const ed = (Array.isArray(education) ? education : []).find(x => x.id === id);
    if (!ed) return;
    showModal('Edit Education', `
      <div class="form-group"><label>Institution</label><input type="text" id="edu-institution" value="${ed.institution || ''}" required></div>
      <div class="form-row">
        <div class="form-group"><label>Degree</label><input type="text" id="edu-degree" value="${ed.degree || ''}" required></div>
        <div class="form-group"><label>Field</label><input type="text" id="edu-field" value="${ed.field || ''}"></div>
      </div>
      <div class="form-group"><label>Location</label><input type="text" id="edu-location" value="${ed.location || ''}"></div>
      <div class="form-row">
        <div class="form-group"><label>Start Date</label><input type="month" id="edu-start" value="${ed.startDate || ''}" required></div>
        <div class="form-group"><label>End Date</label><input type="month" id="edu-end" value="${ed.endDate || ''}"></div>
      </div>
      <div class="form-group"><label>Description</label><textarea id="edu-description" rows="3">${ed.description || ''}</textarea></div>
      <button type="submit" class="btn-primary" onclick="window.saveEducation('${id}')">Update</button>
    `);
  };

  window.saveEducation = async (id = null) => {
    try {
      const payload = {
        institution: document.getElementById('edu-institution').value,
        degree: document.getElementById('edu-degree').value,
        field: document.getElementById('edu-field').value,
        location: document.getElementById('edu-location').value,
        startDate: document.getElementById('edu-start').value,
        endDate: document.getElementById('edu-end').value,
        description: document.getElementById('edu-description').value
      };
      const url = id ? `/api/education/${id}` : '/api/education';
      const method = id ? 'PUT' : 'POST';
      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await readJsonSafe(response);
      if (data && data.success) {
        showNotification(`Education ${id ? 'updated' : 'added'} — saved.`, 'success');
        closeModal();
        loadEducation();
        loadDashboardStats();
      } else {
        showNotification(getApiErrorMessage(response, data, 'Couldn\'t save that education entry. Please try again.'), 'error');
      }
    } catch (e) {
      showNotification('Couldn\'t reach the server. Please try again.', 'error');
    }
  };

  window.deleteEducation = async (id) => {
    if (!confirm('Delete this education entry? This can\'t be undone.')) return;
    try {
      const response = await apiFetch(`/api/education/${id}`, { method: 'DELETE' });
      const data = await readJsonSafe(response);
      if (data && data.success) {
        showNotification('Education entry deleted.', 'success');
        loadEducation();
        loadDashboardStats();
      } else {
        showNotification(getApiErrorMessage(response, data, 'Couldn\'t delete that education entry. Please try again.'), 'error');
      }
    } catch (e) {
      showNotification('Couldn\'t reach the server. Please try again.', 'error');
    }
  };

  window.viewMessage = async (id) => {
    const response = await apiFetch('/api/messages');
    const messages = await response.json();
    const m = (Array.isArray(messages) ? messages : []).find(x => x.id === id);
    if (!m) return;
    showModal('Message', `
      <div class="form-group"><label>From</label><p>${m.name || ''} (${m.email || ''})</p></div>
      <div class="form-group"><label>Subject</label><p>${m.subject || 'No subject'}</p></div>
      <div class="form-group"><label>Message</label><p>${(m.message || '').replace(/\n/g, '<br/>')}</p></div>
      <button type="button" class="btn-primary" onclick="window.toggleMessageRead('${m.id}', ${m.read ? 'true' : 'false'})">${m.read ? 'Mark as Unread' : 'Mark as Read'}</button>
    `);
    if (!m.read) {
      await window.toggleMessageRead(id, false, true);
    }
  };

  window.toggleMessageRead = async (id, currentRead, silent = false) => {
    const response = await apiFetch(`/api/messages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: !currentRead })
    });
    const data = await response.json();
    if (data.success) {
      if (!silent) showNotification('Message updated.', 'success');
      closeModal();
      loadMessages();
    } else {
      showNotification(data.error || 'Couldn\'t update that message. Please try again.', 'error');
    }
  };

  window.deleteMessage = async (id) => {
    if (!confirm('Delete this message? This can\'t be undone.')) return;
    const response = await apiFetch(`/api/messages/${id}`, { method: 'DELETE' });
    const data = await response.json();
    if (data.success) {
      showNotification('Message deleted.', 'success');
      loadMessages();
    } else {
      showNotification(data.error || 'Couldn\'t delete that message. Please try again.', 'error');
    }
  };

  function bindUi() {
    const viewPortfolio = document.getElementById('view-portfolio-link');
    if (viewPortfolio && cfg.FRONTEND_URL) {
      viewPortfolio.href = cfg.FRONTEND_URL;
    }

    const closeBtn = document.querySelector('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
      const modal = document.getElementById('modal');
      if (modal && e.target === modal) closeModal();
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await apiFetch('/api/auth/logout', { method: 'POST' });
          window.location.href = 'login.html';
        } catch (e) {
          showNotification('Couldn\'t log you out. Please try again.', 'error');
        }
      });
    }

    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        const target = document.getElementById(`${section}-section`);
        if (target) target.classList.add('active');
      });
    });

    const addSkillBtn = document.getElementById('add-skill-btn');
    if (addSkillBtn) {
      addSkillBtn.addEventListener('click', () => {
        showModal('Add New Skill', `
          <div class="form-group"><label>Skill Name</label><input type="text" id="skill-name" required></div>
          <div class="form-group"><label>Category</label><input type="text" id="skill-category" required></div>
          <div class="form-group"><label>Level (%)</label><input type="number" id="skill-level" min="0" max="100" required></div>
          <button type="submit" class="btn-primary" onclick="window.saveSkill()">Add Skill</button>
        `);
      });
    }

    const addProjectBtn = document.getElementById('add-project-btn');
    if (addProjectBtn) {
      addProjectBtn.addEventListener('click', () => {
        showModal('Add New Project', `
          <div class="form-group"><label>Project Title</label><input type="text" id="project-title" required></div>
          <div class="form-group"><label>Description</label><textarea id="project-description" rows="3" required></textarea></div>
          <div class="form-group"><label>Tech Stack (comma-separated)</label><input type="text" id="project-techstack" required></div>
          <div class="form-group"><label>Date</label><input type="month" id="project-date" required></div>
          <button type="submit" class="btn-primary" onclick="window.saveProject()">Add Project</button>
        `);
      });
    }

    const addExperienceBtn = document.getElementById('add-experience-btn');
    if (addExperienceBtn) {
      addExperienceBtn.addEventListener('click', () => {
        showModal('Add New Experience', `
          <div class="form-group"><label>Job Title</label><input type="text" id="exp-title" required></div>
          <div class="form-group"><label>Company</label><input type="text" id="exp-company" required></div>
          <div class="form-group"><label>Location</label><input type="text" id="exp-location" required></div>
          <div class="form-row">
            <div class="form-group"><label>Start Date</label><input type="month" id="exp-startdate" required></div>
            <div class="form-group"><label>End Date</label><input type="month" id="exp-enddate"></div>
          </div>
          <div class="form-group"><label><input type="checkbox" id="exp-current"> Currently Working Here</label></div>
          <div class="form-group"><label>Description</label><textarea id="exp-description" rows="3"></textarea></div>
          <div class="form-group"><label>Achievements (comma-separated)</label><input type="text" id="exp-achievements"></div>
          <button type="submit" class="btn-primary" onclick="window.saveExperience()">Add Experience</button>
        `);
      });
    }

    const addBlogBtn = document.getElementById('add-blog-btn');
    if (addBlogBtn) {
      addBlogBtn.addEventListener('click', () => {
        showModal('Add Blog', `
          <div class="form-group"><label>Title</label><input type="text" id="blog-title" required></div>
          <div class="form-group"><label>Excerpt</label><input type="text" id="blog-excerpt"></div>
          <div class="form-group"><label>Content</label><textarea id="blog-content" rows="6" required></textarea></div>
          <div class="form-group"><label>Date</label><input type="date" id="blog-date"></div>
          <div class="form-group"><label>Tags (comma-separated)</label><input type="text" id="blog-tags"></div>
          <div class="form-group"><label>Image</label><input type="file" id="blog-image" accept="image/*"></div>
          <button type="submit" class="btn-primary" onclick="window.saveBlog()">Add Blog</button>
        `);
      });
    }

    const addEducationBtn = document.getElementById('add-education-btn');
    if (addEducationBtn) {
      addEducationBtn.addEventListener('click', () => {
        showModal('Add Education', `
          <div class="form-group"><label>Institution</label><input type="text" id="edu-institution" required></div>
          <div class="form-row">
            <div class="form-group"><label>Degree</label><input type="text" id="edu-degree" required></div>
            <div class="form-group"><label>Field</label><input type="text" id="edu-field"></div>
          </div>
          <div class="form-group"><label>Location</label><input type="text" id="edu-location"></div>
          <div class="form-row">
            <div class="form-group"><label>Start Date</label><input type="month" id="edu-start" required></div>
            <div class="form-group"><label>End Date</label><input type="month" id="edu-end"></div>
          </div>
          <div class="form-group"><label>Description</label><textarea id="edu-description" rows="3"></textarea></div>
          <button type="submit" class="btn-primary" onclick="window.saveEducation()">Add</button>
        `);
      });
    }

    const refreshMessagesBtn = document.getElementById('refresh-messages-btn');
    if (refreshMessagesBtn) refreshMessagesBtn.addEventListener('click', loadMessages);

    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const profileData = {
          name: document.getElementById('profile-name').value,
          role: document.getElementById('profile-role').value,
          bio: document.getElementById('profile-bio').value,
          email: document.getElementById('profile-email').value,
          phone: document.getElementById('profile-phone').value,
          location: document.getElementById('profile-location').value,
          github: document.getElementById('profile-github').value,
          linkedin: document.getElementById('profile-linkedin').value
        };
        const response = await apiFetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData)
        });
        const data = await response.json();
        if (data.success) {
          showNotification('Profile updated.', 'success');
        } else {
          showNotification(data.error || 'Couldn\'t update your profile. Please try again.', 'error');
        }
      });
    }

    const imageUpload = document.getElementById('profile-image-upload');
    if (imageUpload) {
      imageUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);
        const response = await apiFetch('/api/profile/image', { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
          const preview = document.getElementById('profile-image-preview');
          if (preview) preview.src = apiUrl(data.imagePath);
          showNotification('Profile image updated.', 'success');
        } else {
          showNotification(data.error || 'Couldn\'t upload that image. Please try again.', 'error');
        }
      });
    }

    const resumeUpload = document.getElementById('profile-resume-upload');
    if (resumeUpload) {
      resumeUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('resume', file);
        const response = await apiFetch('/api/profile/resume', { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
          const resumeLink = document.getElementById('profile-resume-link');
          if (resumeLink) {
            resumeLink.href = apiUrl(data.resumePath);
            resumeLink.style.display = '';
          }
          showNotification('Resume uploaded.', 'success');
        } else {
          showNotification(data.error || 'Couldn\'t upload the resume. Please try again.', 'error');
        }
      });
    }
  }

  async function init() {
    bindUi();
    await checkAuth();
    await Promise.all([
      loadDashboardStats(),
      loadProfile(),
      loadSkills(),
      loadProjects(),
      loadExperience(),
      loadBlogs(),
      loadEducation(),
      loadMessages()
    ]);
  }

  document.addEventListener('DOMContentLoaded', () => {
    init().catch(console.error);
  });
})();