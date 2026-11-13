const admin = require("firebase-admin");

// Credentials come from the file named in GOOGLE_APPLICATION_CREDENTIALS
// (or the platform's default service account), never from a committed key.
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

module.exports = admin;
