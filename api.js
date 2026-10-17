const API_URL = "https://jsonplaceholder.typicode.com/posts";

let notes = [];

const loadBtn = document.getElementById("load-btn");
const statusMsg = document.getElementById("status");
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitBtn = document.getElementById("submit-btn");
const notesList = document.getElementById("notes-list");

function showStatus(message, type) {
  if (!message) {
    statusMsg.textContent = "";
    statusMsg.className = "";
    statusMsg.style.display = "none";
    return;
  }
  statusMsg.textContent = message;
  statusMsg.className = type;
  statusMsg.style.display = "block";
}

function setButtonsDisabled(disabled) {
  if (loadBtn) loadBtn.disabled = disabled;
  if (submitBtn) submitBtn.disabled = disabled;
  const deleteButtons = document.querySelectorAll(".delete-btn");
  deleteButtons.forEach((btn) => (btn.disabled = disabled));
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

function renderNotes() {
  notesList.innerHTML = "";

  if (notes.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-state";
    emptyItem.textContent = "No notes available. Click 'Load notes' or create one above.";
    notesList.appendChild(emptyItem);
    return;
  }

  notes.forEach((note) => {
    const li = document.createElement("li");
    li.className = "note-item";
    li.setAttribute("data-id", String(note.id));

    const contentDiv = document.createElement("div");
    contentDiv.className = "note-content";

    const titleEl = document.createElement("h3");
    titleEl.textContent = note.title;

    const bodyEl = document.createElement("p");
    bodyEl.textContent = note.body || "No additional content.";

    contentDiv.appendChild(titleEl);
    contentDiv.appendChild(bodyEl);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.type = "button";
    deleteBtn.addEventListener("click", () => deleteNote(note.id));

    li.appendChild(contentDiv);
    li.appendChild(deleteBtn);
    notesList.appendChild(li);
  });
}

async function loadNotes() {
  showStatus("Loading notes...", "loading");
  setButtonsDisabled(true);

  try {
    const data = await request(`${API_URL}?_limit=10`);
    notes = data;
    renderNotes();
    showStatus("Loaded 10 notes from the server.", "success");
  } catch (err) {
    showStatus(`Failed to load notes: ${err.message}`, "error");
  } finally {
    setButtonsDisabled(false);
  }
}

async function createNote(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!title) {
    showStatus("Validation Error: Title is required.", "error");
    return;
  }

  if (title.length > 100) {
    showStatus("Validation Error: Title must not exceed 100 characters.", "error");
    return;
  }

  showStatus("Saving note to server...", "loading");
  setButtonsDisabled(true);

  try {
    const newNote = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ title, body, userId: 1 }),
    });

    notes.unshift(newNote);
    renderNotes();
    noteForm.reset();
    showStatus(`Note created (status 201, id ${newNote.id}).`, "success");
  } catch (err) {
    showStatus(`Failed to create note: ${err.message}`, "error");
  } finally {
    setButtonsDisabled(false);
  }
}

async function deleteNote(id) {
  showStatus(`Deleting note #${id}...`, "loading");
  setButtonsDisabled(true);

  try {
    await request(`${API_URL}/${id}`, { method: "DELETE" });
    notes = notes.filter((n) => n.id !== id);
    renderNotes();
    showStatus(`Note #${id} successfully deleted.`, "success");
  } catch (err) {
    showStatus(`Failed to delete note #${id}: ${err.message}`, "error");
  } finally {
    setButtonsDisabled(false);
  }
}

if (loadBtn) loadBtn.addEventListener("click", loadNotes);
if (noteForm) noteForm.addEventListener("submit", createNote);

renderNotes();
