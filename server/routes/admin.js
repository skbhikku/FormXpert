import express from 'express';
import { User, Form, Response } from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const stats = {};
    
    // Get user count
    stats.activeUsers = await User.countDocuments({ isActive: true });
    
    // Get form count
    stats.activeForms = await Form.countDocuments({ isActive: true });
    
    // Get response count
    stats.totalResponses = await Response.countDocuments();
    
    // Get recent activity
    const recentUsers = await User.find({ 
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
    .select('email createdAt')
    .sort({ createdAt: -1 })
    .limit(5);
    
    const recentForms = await Form.find({ 
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
    .select('title createdAt')
    .sort({ createdAt: -1 })
    .limit(5);
    
    const recentActivity = [
      ...recentUsers.map(user => ({
        type: 'user',
        title: user.email,
        createdAt: user.createdAt
      })),
      ...recentForms.map(form => ({
        type: 'form',
        title: form.title,
        createdAt: form.createdAt
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);
    
    stats.recentActivity = recentActivity;
    
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('_id email firstName lastName role isActive createdAt')
      .sort({ createdAt: -1 });
    
    const formattedUsers = users.map(user => ({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    }));
    
    res.json(formattedUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Toggle user active status
router.put('/users/:id/toggle-active', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.isActive = !user.isActive;
    await user.save();
    
    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    // Don't allow deleting self
    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Also delete user's forms and responses
    const userForms = await Form.find({ userId: req.params.id });
    const formIds = userForms.map(form => form._id);
    
    if (formIds.length > 0) {
      await Response.deleteMany({ formId: { $in: formIds } });
      await Form.deleteMany({ userId: req.params.id });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get all forms
router.get('/forms', async (req, res) => {
  try {
    const forms = await Form.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'creator'
        }
      },
      {
        $lookup: {
          from: 'responses',
          localField: '_id',
          foreignField: 'formId',
          as: 'responses'
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          mode: 1,
          isActive: 1,
          createdAt: 1,
          creatorEmail: { $arrayElemAt: ['$creator.email', 0] },
          responseCount: { $size: '$responses' }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);
    
    const formattedForms = forms.map(form => ({
      id: form._id,
      title: form.title,
      mode: form.mode,
      isActive: form.isActive,
      createdAt: form.createdAt,
      creatorEmail: form.creatorEmail,
      responseCount: form.responseCount
    }));
    
    res.json(formattedForms);
  } catch (error) {
    console.error('Get forms error:', error);
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

// Delete form
router.delete('/forms/:id', async (req, res) => {
  try {
    const form = await Form.findByIdAndDelete(req.params.id);
    
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    // Also delete responses
    await Response.deleteMany({ formId: req.params.id });
    
    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({ error: 'Failed to delete form' });
  }
});

export default router;