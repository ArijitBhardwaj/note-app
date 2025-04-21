// backend/middleware/auth.js
const admin = require("../firebase-admin");

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Attach user data
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = authenticate;