const express = require('express');
const router = express.Router();
const Message = require('../models/message'); // ✅ ensure file is lowercase

module.exports = (users) => {
  // GET conversation
  router.get('/:username', async (req, res) => {
    const { username } = req.params;
    const currentUser = req.session.user;

    const otherUser = await users.findOne({ username });
    if (!otherUser) return res.status(404).send('User not found');

    const messages = await Message.find({
      $or: [
        { sender: currentUser._id, recipient: otherUser._id },
        { sender: otherUser._id, recipient: currentUser._id }
      ]
    }).sort({ timestamp: 1 });

    res.render('messages', {
      currentUser,
      otherUser,
      messages
    });
  });

  // POST message
  router.post('/:username', async (req, res) => {
    const { username } = req.params;
    const { content } = req.body;
    const sender = req.session.user;

    const recipient = await users.findOne({ username });
    if (!recipient) return res.status(404).send('User not found');

    const message = new Message({
      sender: sender._id,
      recipient: recipient._id,
      content
    });

    await message.save();
    res.redirect(`/messages/${username}`);
  });

  return router;
};
