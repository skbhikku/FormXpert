import express from 'express';
import { Form, Response } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Create form
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, headerImage, mode, questions, settings } = req.body;

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Title and at least one question are required' });
    }

    const form = new Form({
      _id: uuidv4(),
      userId: req.user.id,
      title,
      description: description || '',
      headerImage: headerImage || '',
      mode: mode || 'survey',
      questions: questions.map(q => ({
        ...q,
        items: q.items || [],
        categories: q.categories || [],
        blanks: q.blanks || [],
        followUpQuestions: q.followUpQuestions || []
      })),
      settings: {
        allowAnonymous: settings?.allowAnonymous ?? true,
        showResults: settings?.showResults ?? true
        },
      shareId: uuidv4()
    });

    await form.save();

    res.status(201).json({
      id: form._id,
      title: form.title,
      description: form.description,
      headerImage: form.headerImage,
      mode: form.mode,
      questions: form.questions,
      settings: form.settings,
      shareUrl: `/forms/${form.shareId}`
    });
  } catch (error) {
    console.error('Create form error:', error);
    res.status(500).json({ error: 'Failed to create form' });
  }
});

// Update form
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, headerImage, mode, questions, settings } = req.body;

    const form = await Form.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        headerImage,
        mode,
        questions: questions.map(q => ({
          ...q,
          items: q.items || [],
          categories: q.categories || [],
          blanks: q.blanks || [],
          followUpQuestions: q.followUpQuestions || []
        })),
        settings: {
          allowAnonymous: settings?.allowAnonymous ?? true,
          showResults: settings?.showResults ?? true,
          timeLimit: settings?.timeLimit || 0
        },
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

// Get user's forms
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const forms = await Form.find({ userId: req.user.id })
      .select('_id title description headerImage mode isActive createdAt shareId')
      .sort({ createdAt: -1 });

    const formsWithCounts = await Promise.all(
      forms.map(async form => {
        const responseCount = await Response.countDocuments({ formId: form._id });
        return {
          id: form._id,
          title: form.title,
          description: form.description,
          headerImage: form.headerImage,
          mode: form.mode,
          isActive: form.isActive,
          createdAt: form.createdAt,
          shareId: form.shareId,
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
router.get('/:shareId/public', async (req, res) => {
  try {
    const form = await Form.findOne({
      shareId: req.params.shareId,
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


//getting form for user to view
router.get('/:formId/view', async (req, res) => { 
  try {
    const form = await Form.findOne({
      _id: req.params.formId,
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
      responseCount,
      shareId: form.shareId
    });
  } catch (error) {
    console.error('Get form error:', error);
    res.status(500).json({ error: 'Database error' });
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

    await Response.deleteMany({ formId: req.params.id });

    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({ error: 'Failed to delete form' });
  }
});

export default router;
