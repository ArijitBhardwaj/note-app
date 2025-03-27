import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await axios.get(
          "http://note-app-backend-service/api/notes"
        );
        console.log("API Response:", response.data); // Debugging line
        setNotes(response.data);
      } catch (err) {
        console.error("Fetch Error:", err); // Debugging line
      }
    };
    fetchNotes();
  }, []);

  return (
    <div>
      <h1>Notes</h1>
      {notes.length === 0 ? (
        <p>No notes found.</p>
      ) : (
        notes.map((note) => (
          <div key={note.noteId}>
            <p>{note.content}</p>
          </div>
        ))
      )}
    </div>
  );
}

export default App;
