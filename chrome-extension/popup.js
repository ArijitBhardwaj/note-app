import { io } from "socket.io-client";
import { initAuth, handleSignIn, handleSignUp, handleSignOut } from "./auth.js";

const BACKEND_URL =
  "http://a2f2af860725d450b98395e40f2dd3b0-1687692579.us-west-1.elb.amazonaws.com";
let socket = null;

// DOM Elements
const elements = {
  authScreen: document.getElementById("auth-screen"),
  dashboard: document.getElementById("dashboard"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  signinBtn: document.getElementById("signin-btn"),
  signupBtn: document.getElementById("signup-btn"),
  signoutBtn: document.getElementById("signout-btn"),
  notesList: document.getElementById("notes-list"),
  newNoteInput: document.getElementById("new-note-input"),
  addNoteBtn: document.getElementById("add-note-btn"),
  authMessage: document.getElementById("auth-message"),
};

// State
let currentUser = null;
let notes = [];

// Initialize Auth
initAuth(async (user) => {
  currentUser = user;
  if (user) {
    showDashboard();
    await initializeSocket();
    await fetchNotes();
    startAutoRefresh();
  } else {
    showAuthScreen();
    stopAutoRefresh();
  }
});

// Auth Handlers
elements.signinBtn.addEventListener("click", async () => {
  const result = await handleSignIn(
    elements.email.value,
    elements.password.value
  );
  handleAuthResult(result);
});

elements.signupBtn.addEventListener("click", async () => {
  const result = await handleSignUp(
    elements.email.value,
    elements.password.value
  );
  handleAuthResult(result);
});

elements.signoutBtn.addEventListener("click", () => handleSignOut());

// Note Operations
elements.addNoteBtn.addEventListener("click", async () => {
  const content = elements.newNoteInput.value.trim();
  if (!content) return;

  try {
    const token = await currentUser.getIdToken();
    await fetch(`${BACKEND_URL}/api/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });
    elements.newNoteInput.value = "";
    await fetchNotes();
  } catch (error) {
    showMessage(`Error: ${error.message}`, "error");
  }
});

// Real-time Setup
async function initializeSocket() {
  const token = await currentUser.getIdToken();

  socket = io(BACKEND_URL, {
    transports: ["websocket"],
    auth: { token },
  });

  socket.on("noteUpdated", (updatedNote) => {
    notes = notes.map((n) =>
      n.noteId === updatedNote.noteId ? updatedNote : n
    );
    renderNotes();
  });
}

// Fetch Notes
async function fetchNotes() {
  try {
    const token = await currentUser.getIdToken();
    const response = await fetch(`${BACKEND_URL}/api/notes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    notes = await response.json();
    renderNotes();
  } catch (error) {
    showMessage(`Error fetching notes: ${error.message}`, "error");
  }
}

// Render Notes
function renderNotes() {
  elements.notesList.innerHTML = notes
    .map(
      (note) => `
    <div class="note-card" data-note-id="${note.noteId}">
      <div class="note-content">${note.content}</div>
      <div class="note-actions">
        <button class="edit-btn btn secondary">Edit</button>
        <button class="delete-btn btn secondary">Delete</button>
        <input type="email" class="collab-email" placeholder="Invite collaborator">
        <button class="invite-btn btn primary">Invite</button>
      </div>
    </div>
  `
    )
    .join("");

  // Add event listeners to all buttons
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", handleEdit);
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", handleDelete);
  });

  document.querySelectorAll(".invite-btn").forEach((btn) => {
    btn.addEventListener("click", handleInvite);
  });
}

// UI Helpers
function showDashboard() {
  elements.authScreen.classList.add("hidden");
  elements.dashboard.classList.remove("hidden");
}

function showAuthScreen() {
  elements.authScreen.classList.remove("hidden");
  elements.dashboard.classList.add("hidden");
}

function showMessage(text, type = "info") {
  elements.authMessage.textContent = text;
  elements.authMessage.className = `message ${type}`;
  setTimeout(() => (elements.authMessage.textContent = ""), 3000);
}

function handleAuthResult(result) {
  if (result.success) {
    showMessage("Success! Redirecting...", "success");
  } else {
    showMessage(result.error, "error");
  }
}

// Auto Refresh
let refreshInterval;

function startAutoRefresh() {
  refreshInterval = setInterval(async () => {
    await fetchNotes();
  }, 5000);
}

function stopAutoRefresh() {
  clearInterval(refreshInterval);
}

// Event Handlers
async function handleEdit(event) {
  const noteCard = event.target.closest(".note-card");
  const noteId = noteCard.dataset.noteId;
  const contentDiv = noteCard.querySelector(".note-content");
  const originalContent = contentDiv.textContent;

  const input = document.createElement("input");
  input.value = originalContent;
  contentDiv.replaceWith(input);
  input.focus();

  const saveEdit = async () => {
    const newContent = input.value.trim();
    try {
      const token = await currentUser.getIdToken();
      await fetch(`${BACKEND_URL}/api/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newContent }),
      });
      socket.emit("noteUpdate", { noteId, content: newContent });
    } catch (error) {
      showMessage(`Error updating note: ${error.message}`, "error");
    }
    input.replaceWith(contentDiv);
  };

  input.addEventListener("blur", saveEdit);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") saveEdit();
  });
}

async function handleDelete(event) {
  const noteId = event.target.closest(".note-card").dataset.noteId;
  try {
    const token = await currentUser.getIdToken();
    await fetch(`${BACKEND_URL}/api/notes/${noteId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    await fetchNotes();
  } catch (error) {
    showMessage(`Error deleting note: ${error.message}`, "error");
  }
}

async function handleInvite(event) {
  const noteId = event.target.closest(".note-card").dataset.noteId;
  const emailInput = event.target.previousElementSibling;
  const email = emailInput.value.trim();

  if (!email) {
    showMessage("Please enter an email address", "error");
    return;
  }

  try {
    const token = await currentUser.getIdToken();
    const response = await fetch(`${BACKEND_URL}/api/notes/${noteId}/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ collaboratorEmail: email }),
    });

    if (!response.ok) throw new Error("Invite failed");

    emailInput.value = "";
    showMessage("Invite sent successfully!", "success");
  } catch (error) {
    showMessage(`Error sending invite: ${error.message}`, "error");
  }
}
