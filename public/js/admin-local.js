const API_URL = 'http://127.0.0.1:3000/api';

const listView = document.getElementById('listView');
const formView = document.getElementById('formView');
const projectListContainer = document.getElementById('projectListContainer');
const projectForm = document.getElementById('projectForm');
const formTitle = document.getElementById('formTitle');
const imagePreview = document.getElementById('imagePreview');

let isEditing = false;

// --- Event Listeners ---

document.getElementById('addNewBtn').addEventListener('click', () => showForm());
document.getElementById('cancelBtn').addEventListener('click', () => showList());

projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveProject();
});

// --- Views toggling ---
function showList() {
    listView.classList.remove('hidden');
    formView.classList.add('hidden');
    resetForm();
    fetchProjects();
}

function showForm(editMode = false) {
    listView.classList.add('hidden');
    formView.classList.remove('hidden');
    isEditing = editMode;
    formTitle.textContent = editMode ? 'Edit Project' : 'Add New Project';
}

function resetForm() {
    projectForm.reset();
    document.getElementById('projectId').value = '';
    document.getElementById('existingImage').value = '';
    imagePreview.classList.add('hidden');
}

// --- API Interactions ---

async function fetchProjects() {
    try {
        const res = await fetch(`${API_URL}/projects`);
        const projects = await res.json();
        renderList(projects);
    } catch (error) {
        console.error("Error fetching projects:", error);
        projectListContainer.innerHTML = '<p>Error loading projects.</p>';
    }
}

async function saveProject() {
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const id = document.getElementById('projectId').value;
    const formData = new FormData(projectForm);

    const url = isEditing ? `${API_URL}/projects/${id}` : `${API_URL}/projects`;
    const method = isEditing ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            body: formData 
        });

        if (res.ok) {
            showList();
        } else {
            alert('Failed to save project.');
        }
    } catch (error) {
        console.error("Error saving:", error);
        alert('An error occurred.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Project';
    }
}

async function deleteProject(id) {
    if(!confirm('Are you sure you want to delete this project?')) return;

    try {
        const res = await fetch(`${API_URL}/projects/${id}`, { method: 'DELETE' });
        if (res.ok) {
            fetchProjects();
        } else {
            alert('Failed to delete project.');
        }
    } catch (error) {
        console.error("Error deleting:", error);
    }
}

async function editProject(id, projectData) {
    showForm(true);
    document.getElementById('projectId').value = id;
    document.getElementById('title').value = projectData.title;
    document.getElementById('tags').value = projectData.tags.join(', ');
    document.getElementById('existingImage').value = projectData.image || '';

    if (projectData.image) {
        imagePreview.classList.remove('hidden');
        imagePreview.querySelector('img').src = `/public-images/${projectData.image.replace('images/', '')}`;
    }

    try {
        const res = await fetch(`${API_URL}/projects/content/${id}`);
        const markdown = await res.text();
        document.getElementById('markdown').value = markdown;
    } catch (error) {
        console.error("Error fetching markdown:", error);
        document.getElementById('markdown').value = "Error loading content.";
    }
}


// --- Rendering ---

function renderList(projects) {
    projectListContainer.innerHTML = '';
    if (projects.length === 0) {
        projectListContainer.innerHTML = '<p>No projects yet. Click "Add New Project" to get started.</p>';
        return;
    }

    projects.forEach(project => {
        const item = document.createElement('div');
        item.className = 'project-item';
        item.innerHTML = `
            <div class="project-info">
                <h3>${project.title}</h3>
                <div class="project-meta">
                    <span>${project.date}</span> | 
                    <span>${project.tags.join(', ')}</span>
                </div>
            </div>
            <div class="actions">
                <button class="btn edit-btn">Edit</button>
                <button class="btn btn-danger delete-btn">Delete</button>
            </div>
        `;

        item.querySelector('.edit-btn').addEventListener('click', () => editProject(project.id, project));
        item.querySelector('.delete-btn').addEventListener('click', () => deleteProject(project.id));

        projectListContainer.appendChild(item);
    });
}

// Initialize
fetchProjects();