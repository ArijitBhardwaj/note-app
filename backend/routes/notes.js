// routes/notes.js

const express = require("express");
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const authenticate = require("../middleware/auth");
const admin = require("firebase-admin");

// If you haven't already initialized Firebase Admin, do so here (adjust path as needed):
// admin.initializeApp({
//   credential: admin.credential.cert(require("../serviceAccountKey.json")),
// });

AWS.config.update({
  region: process.env.AWS_REGION,
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = "Notes";

const router = express.Router();

// Apply authentication middleware to all note routes
router.use(authenticate);

/**
 * Helper function to check if the current user is either the owner or a collaborator.
 */
function canAccessNote(noteItem, currentUserId) {
  return (
    noteItem.userId === currentUserId ||
    (Array.isArray(noteItem.collaborators) &&
      noteItem.collaborators.includes(currentUserId))
  );
}

/**
 * CREATE: Add a new note.
 * Initializes an empty collaborators array.
 */
router.post("/", async (req, res) => {
  const { content } = req.body;
  const userId = req.user.uid; // From Firebase token

  if (!content) {
    return res.status(400).json({ error: "Content is required" });
  }

  const noteId = uuidv4();
  const params = {
    TableName: TABLE_NAME,
    Item: {
      noteId,
      content,
      userId, // The owner
      collaborators: [],
      createdAt: new Date().toISOString(),
    },
  };

  try {
    await dynamoDB.put(params).promise();
    res.status(201).json({ noteId, message: "Note created!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create note" });
  }
});

/**
 * READ ALL: Get all notes accessible by the current user (as owner or collaborator).
 */
router.get("/", async (req, res) => {
  const userId = req.user.uid;
  const params = {
    TableName: TABLE_NAME,
  };

  try {
    const data = await dynamoDB.scan(params).promise();
    const filtered = data.Items.filter((note) => {
      return (
        note.userId === userId ||
        (Array.isArray(note.collaborators) && note.collaborators.includes(userId))
      );
    });
    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

/**
 * READ SINGLE: Get a note by ID (if accessible).
 */
router.get("/:noteId", async (req, res) => {
  const { noteId } = req.params;
  const userId = req.user.uid;
  const params = { TableName: TABLE_NAME, Key: { noteId } };

  try {
    const data = await dynamoDB.get(params).promise();
    if (!data.Item) {
      return res.status(404).json({ error: "Note not found" });
    }
    if (!canAccessNote(data.Item, userId)) {
      return res.status(403).json({ error: "Unauthorized access" });
    }
    res.json(data.Item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch note" });
  }
});

/**
 * UPDATE: Modify an existing note (if accessible).
 */
router.put("/:noteId", async (req, res) => {
  const { noteId } = req.params;
  const { content } = req.body;
  const userId = req.user.uid;

  if (!content) {
    return res.status(400).json({ error: "Content is required" });
  }

  try {
    const existingNote = await dynamoDB
      .get({ TableName: TABLE_NAME, Key: { noteId } })
      .promise();
    if (!existingNote.Item) {
      return res.status(404).json({ error: "Note not found" });
    }
    if (!canAccessNote(existingNote.Item, userId)) {
      return res.status(403).json({ error: "Unauthorized access" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Verification failed" });
  }

  const params = {
    TableName: TABLE_NAME,
    Key: { noteId },
    UpdateExpression: "set content = :c",
    ExpressionAttributeValues: { ":c": content },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    const data = await dynamoDB.update(params).promise();
    res.json({ message: "Note updated!", updatedAttributes: data.Attributes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update note" });
  }
});

/**
 * DELETE: Remove a note (if accessible).
 */
router.delete("/:noteId", async (req, res) => {
  const { noteId } = req.params;
  const userId = req.user.uid;

  try {
    const existingNote = await dynamoDB
      .get({ TableName: TABLE_NAME, Key: { noteId } })
      .promise();
    if (!existingNote.Item) {
      return res.status(404).json({ error: "Note not found" });
    }
    if (!canAccessNote(existingNote.Item, userId)) {
      return res.status(403).json({ error: "Unauthorized access" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Verification failed" });
  }

  const params = { TableName: TABLE_NAME, Key: { noteId } };

  try {
    await dynamoDB.delete(params).promise();
    res.json({ message: "Note deleted!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

/**
 * INVITE: Add a collaborator by email to the note.
 * Only the note's owner can invite collaborators.
 */
router.post("/:noteId/invite", async (req, res) => {
  const { noteId } = req.params;
  const { collaboratorEmail } = req.body;
  const currentUserId = req.user.uid;

  if (!collaboratorEmail) {
    return res.status(400).json({ error: "Collaborator email is required" });
  }

  let existingNote;
  try {
    const data = await dynamoDB.get({ TableName: TABLE_NAME, Key: { noteId } }).promise();
    if (!data.Item) {
      return res.status(404).json({ error: "Note not found" });
    }
    // Only the owner can invite collaborators
    if (data.Item.userId !== currentUserId) {
      return res.status(403).json({ error: "Only owner can invite collaborators" });
    }
    existingNote = data.Item;
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to read note" });
  }

  let collaboratorUser;
  try {
    collaboratorUser = await admin.auth().getUserByEmail(collaboratorEmail);
  } catch (err) {
    console.error(err);
    return res.status(404).json({ error: "No Firebase user found with that email" });
  }

  const collaboratorUid = collaboratorUser.uid;
  const collaborators = existingNote.collaborators || [];
  if (!collaborators.includes(collaboratorUid)) {
    collaborators.push(collaboratorUid);
  }

  const updateParams = {
    TableName: TABLE_NAME,
    Key: { noteId },
    UpdateExpression: "set collaborators = :collabs",
    ExpressionAttributeValues: { ":collabs": collaborators },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    await dynamoDB.update(updateParams).promise();
    res.json({
      message: `User ${collaboratorEmail} added as a collaborator`,
      collaborators,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update collaborators" });
  }
});

// --- Socket.IO Integration ---
// We want to allow other modules to use our Socket.IO instance for real-time events.
let io;
function initIO(socketInstance) {
  io = socketInstance;
}

module.exports = { router, initIO };
