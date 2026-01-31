const express = require('express');
const Skill = require('../models/Skill');
const User = require('../models/User');
const router = express.Router();

// ✅ INLINE AUTH (matches your auth.js)
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = 'supersecretkey12345skillswappro';
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// 🔥 PERFECT PUBLIC SEARCH (for SkillMatching.jsx)
router.get('/public', async (req, res) => {
  try {
    const { search, page = 1, limit = 12 } = req.query;
    const query = {};
    
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    
    const skills = await Skill.find(query)
      .populate('userId', 'name avatar')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    res.json(skills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🔥 MY SKILLS (Dashboard)
router.get('/', auth, async (req, res) => {
  try {
    const skills = await Skill.find({ userId: req.user.id });
    res.json(skills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🔥 ADD SKILL (SkillsForm)
router.post('/', auth, async (req, res) => {
  try {
    const skill = new Skill({
      ...req.body,
      userId: req.user.id
    });
    await skill.save();
    res.status(201).json(skill);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 🔥 UPDATE/DELETE (Dashboard)
router.put('/:id', auth, async (req, res) => {
  try {
    const skill = await Skill.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    if (!skill) return res.status(404).json({ message: 'Skill not found' });
    res.json(skill);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const skill = await Skill.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    if (!skill) return res.status(404).json({ message: 'Skill not found' });
    res.json({ message: 'Skill deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
