// server/models/Request.js
const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromSkill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true },
  toSkill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Request', requestSchema);
