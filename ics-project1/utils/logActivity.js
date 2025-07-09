// utils/logActivity.js
const { ObjectId } = require('mongodb');

async function logActivity(db, { type, description, userId = null }) {
  await db.collection('activities').insertOne({
    type,               // e.g., 'signup', 'report', 'purchase'
    description,        // e.g., 'User @melo signed up'
    userId: userId ? new ObjectId(userId) : null,
    timestamp: new Date()
  });
}

module.exports = logActivity;
