const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String, default: '' },           // 👈 ADD
  avatar: { type: String, default: '' },
  skills: [String],
  location: String,
  rating: { type: Number, default: 5 },
  isTrainer: { type: Boolean, default: false },
  avatar: {
    type: String,
    default: 'https://ui-avatars.com/api/?name=User&background=0d8abc&color=fff'
  }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);
