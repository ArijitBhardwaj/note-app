// src/pages/DashboardPage.js

import { useEffect, useState } from "react";
import { auth } from "../firebase-config";
import { signOut, onAuthStateChanged } from "firebase/auth";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// For real-time
import { io } from "socket.io-client";

// REPLACE with your actual load balancer URL
const BACKEND_BASE_URL =
  "http://a2f2af860725d450b98395e40f2dd3b0-1687692579.us-west-1.elb.amazonaws.com";

// We'll connect to the same domain for Socket.IO
const socket = io(BACKEND_BASE_URL, {
  transports: ["websocket", "polling"], // Ensures websockets are used
});

function DashboardPage() {
  const [notes, setNotes] = useState([]);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editNoteId, setEditNoteId] = useState(null);
  const [editNoteContent, setEditNoteContent] = useState("");
  const [user, setUser] = useState(null);

  // For inviting collaborators
  const [inviteEmail, setInviteEmail] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    // Listen for auth state changes:
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch notes:
        await fetchNotes(currentUser);
      } else {
        // If no user is logged in, redirect to Sign In
        navigate("/signin");
      }
    });

    // Real-time: Listen for noteUpdated events
    socket.on("noteUpdated", (data) => {
      // Example: if noteId matches one we have locally, update it
      setNotes((prevNotes) => {
        return prevNotes.map((n) => {
          if (n.noteId === data.noteId) {
            return { ...n, content: data.content };
          }
          return n;
        });
      });
    });

    return () => {
      unsubscribe();
      socket.off("noteUpdated");
    };
    // eslint-disable-next-line
  }, []);

  const fetchNotes = async (currentUser) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await axios.get(`${BACKEND_BASE_URL}/api/notes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setNotes(response.data);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  const saveNote = async (content) => {
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${BACKEND_BASE_URL}/api/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error("Failed to save note.");
      }

      // Refresh notes
      await fetchNotes(auth.currentUser);
      setNewNoteContent("");
    } catch (err) {
      console.error(err);
      alert("Error saving note: " + err.message);
    }
  };

  const updateNote = async (noteId, updatedContent) => {
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${BACKEND_BASE_URL}/api/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: updatedContent }),
      });

      if (!response.ok) {
        throw new Error("Failed to update note.");
      }

      // Optionally, we can emit a "noteUpdated" event so we see changes
      socket.emit("noteUpdated", { noteId, content: updatedContent });

      await fetchNotes(auth.currentUser);
      setEditNoteId(null);
      setEditNoteContent("");
    } catch (err) {
      console.error(err);
      alert("Error updating note: " + err.message);
    }
  };

  const deleteNote = async (noteId) => {
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${BACKEND_BASE_URL}/api/notes/${noteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete note.");
      }

      await fetchNotes(auth.currentUser);
    } catch (err) {
      console.error(err);
      alert("Error deleting note: " + err.message);
    }
  };

  // Invite a collaborator
  const inviteCollaborator = async (noteId) => {
    if (!inviteEmail) {
      alert("Please enter an email address.");
      return;
    }

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(
        `${BACKEND_BASE_URL}/api/notes/${noteId}/invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ collaboratorEmail: inviteEmail }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to invite collaborator.");
      }

      const resData = await response.json();
      alert(resData.message || "Collaborator invited successfully!");
      setInviteEmail("");
    } catch (err) {
      alert("Error inviting collaborator: " + err.message);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    // Clear notes & user
    setNotes([]);
    setUser(null);
    navigate("/signin");
  };

  // For editing
  const startEditNote = (note) => {
    setEditNoteId(note.noteId);
    setEditNoteContent(note.content);
  };
  const handleSaveEdit = () => {
    if (editNoteId) {
      updateNote(editNoteId, editNoteContent);
    }
  };

  // Example: user clicks "Join" to join the note's room for real-time
  const handleJoinNote = (noteId) => {
    socket.emit("joinNote", noteId);
    alert(`Joined the real-time room for note ${noteId}!`);
  };

  return (
    <div style={{ margin: "20px" }}>
      {user && (
        <>
          <h1>Welcome {user.email}!</h1>
          <button onClick={handleSignOut}>Sign Out</button>

          <h2>Notes</h2>
          {notes.length === 0 ? (
            <p>No notes found.</p>
          ) : (
            notes.map((note) => (
              <div key={note.noteId} style={styles.noteContainer}>
                {editNoteId === note.noteId ? (
                  <div>
                    <input
                      type="text"
                      value={editNoteContent}
                      onChange={(e) => setEditNoteContent(e.target.value)}
                    />
                    <button onClick={handleSaveEdit}>Save</button>
                    <button
                      onClick={() => {
                        setEditNoteId(null);
                        setEditNoteContent("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p>{note.content}</p>
                )}

                <button onClick={() => startEditNote(note)}>Edit</button>
                <button onClick={() => deleteNote(note.noteId)}>Delete</button>

                {/* Real-time Collaboration */}
                <button onClick={() => handleJoinNote(note.noteId)}>
                  Join
                </button>

                {/* Invite collaborator */}
                <div style={{ marginTop: "8px" }}>
                  <input
                    type="email"
                    placeholder="Collaborator email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <button onClick={() => inviteCollaborator(note.noteId)}>
                    Invite
                  </button>
                </div>
              </div>
            ))
          )}

          <div>
            <h3>Add a Note</h3>
            <input
              type="text"
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="New Note Content"
            />
            <button onClick={() => saveNote(newNoteContent)}>Save Note</button>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  noteContainer: {
    border: "1px solid #ccc",
    margin: "5px 0",
    padding: "5px",
  },
};

export default DashboardPage;
