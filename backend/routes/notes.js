const express = require("express");
const AWS = require("aws-sdk");
const router = express.Router();
const { v4: uuidv4 } = require("uuid"); // For generating unique IDs

AWS.config.update({
  region: process.env.AWS_REGION,
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = "Notes";

// --- CREATE: Add a new note (auto-generate ID) ---
router.post("/", async (req, res) => {
  const { content } = req.body;

  // Validate input
  if (!content) {
    return res.status(400).json({ error: "Content is required" });
  }

  const noteId = uuidv4(); // Auto-generate ID
  const params = {
    TableName: TABLE_NAME,
    Item: { noteId, content, createdAt: new Date().toISOString() },
  };

  try {
    await dynamoDB.put(params).promise();
    res.status(201).json({ noteId, message: "Note created!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to create note" });
  }
});

// --- READ: Get all notes ---
router.get("/", async (req, res) => {
  const params = { TableName: TABLE_NAME };
  try {
    const data = await dynamoDB.scan(params).promise();
    res.json(data.Items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// --- READ: Get single note by ID ---
router.get("/:noteId", async (req, res) => {
  const { noteId } = req.params;
  const params = {
    TableName: TABLE_NAME,
    Key: { noteId },
  };

  try {
    const data = await dynamoDB.get(params).promise();
    if (!data.Item) {
      return res.status(404).json({ error: "Note not found" });
    }
    res.json(data.Item);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch note" });
  }
});

// --- UPDATE: Modify existing note ---
router.put("/:noteId", async (req, res) => {
  const { noteId } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: "Content is required" });
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
    res.status(500).json({ error: "Failed to update note" });
  }
});

// --- DELETE: Remove a note ---
router.delete("/:noteId", async (req, res) => {
  const { noteId } = req.params;
  const params = {
    TableName: TABLE_NAME,
    Key: { noteId },
  };

  try {
    await dynamoDB.delete(params).promise();
    res.json({ message: "Note deleted!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete note" });
  }
});

module.exports = router;
