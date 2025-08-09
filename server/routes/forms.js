import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Form, Response } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Create form
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, headerImage, mode, questions, settings } = req.body;
    
    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Title and at least one question are required' });
    }

    const formId = uuidv4();
    const shareId = uuidv4();
    
    const form = new Form({
      _id: formId,
      userId: req.user.id,
      title,
      description,
      headerImage,
      mode: mode || 'survey',
      questions,
      settings: settings || {},
      shareId
    });

    await form.save();

    res.status(201).json({ 
      id: formId,
      title,
      description,
      headerImage,
      mode: mode || 'survey',
      questions,
      settings: settings || {},
      shareUrl: `/forms/${shareId}`
    });
  } catch (error) {
    console.error('Create form error:', error);
    res.status(500).json({ error: 'Failed to create form' });
  }
});

// Get user's forms
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const forms = await Form.find({ userId: req.user.id })
      .select('_id title description headerImage mode isActive createdAt')
      .sort({ createdAt: -1 });

    // Get response counts for each form
    const formsWithCounts = await Promise.all(
      forms.map(async (form) => {
        const responseCount = await Response.countDocuments({ formId: form._id });
        return {
          id: form._id,
          title: form.title,
          description: form.description,
          headerImage: form.headerImage,
          mode: form.mode,
          isActive: form.isActive,
          createdAt: form.createdAt,
          responseCount
        };
      })
    );

    res.json(formsWithCounts);
  } catch (error) {
    console.error('Get forms error:', error);
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

// Get public form
router.get('/:id/public', async (req, res) => {
  try {
    const form = await Form.findOne({ 
      _id: req.params.id, 
      isActive: true 
    }).select('_id title description headerImage mode questions settings');
    
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json({
      id: form._id,
      title: form.title,
      description: form.description,
      headerImage: form.headerImage,
      mode: form.mode,
      questions: form.questions,
      settings: form.settings
    });
  } catch (error) {
    console.error('Get public form error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get form with responses (owner only)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const form = await Form.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Get response count
    const responseCount = await Response.countDocuments({ formId: form._id });

    res.json({
      id: form._id,
      title: form.title,
      description: form.description,
      headerImage: form.headerImage,
      mode: form.mode,
      questions: form.questions,
      settings: form.settings,
      isActive: form.isActive,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
      responseCount
    });
  } catch (error) {
    console.error('Get form error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update form
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, headerImage, mode, questions, settings } = req.body;
    
    const form = await Form.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      {
        title,
        description,
        headerImage,
        mode,
        questions,
        settings,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json({ message: 'Form updated successfully' });
  } catch (error) {
    console.error('Update form error:', error);
    res.status(500).json({ error: 'Failed to update form' });
  }
});

// Delete form
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const form = await Form.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

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

export default router; // ✅ ESM
