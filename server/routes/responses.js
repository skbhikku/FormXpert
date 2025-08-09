import express from 'express';
import { Form, Response } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const router = express.Router();

// Rate limiter for form submissions
const submitLimiter = new RateLimiterMemory({
  points: 10, // 10 submissions
  duration: 3600, // per hour
});

// Submit response
router.post('/:formId', async (req, res) => {
  try {
    await submitLimiter.consume(req.ip);
    
    const { answers } = req.body;
    const formId = req.params.formId;
    
    if (!answers) {
      return res.status(400).json({ error: 'Answers are required' });
    }

    // Get form to validate and calculate score
    const form = await Form.findOne({ _id: formId, isActive: true });
    
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    let score = null;
    let maxScore = null;

    // Calculate score for test mode
    if (form.mode === 'test') {
      score = 0;
      maxScore = 0;
      
      form.questions.forEach((question, index) => {
        const userAnswer = answers[index];
        if (!userAnswer) return;

        maxScore += question.points || 1;

        switch (question.type) {
          // ... existing code ...
case 'categorize': {
  if (userAnswer.categories) {
    // Extract correct answer from question structure
    const correctAnswer = question.categories.map(category => category.items || []);
    
    let correctCount = 0;
    
    // Compare each category
    correctAnswer.forEach((correctItems, catIndex) => {
      const userItems = userAnswer.categories[catIndex] || [];
      
      // Sort and compare arrays
      if (
        JSON.stringify(userItems.sort()) === 
        JSON.stringify(correctItems.sort())
      ) {
        correctCount++;
      }
    });
    
    // Calculate partial credit
    score += (correctCount / correctAnswer.length) * (question.points || 1);
  }
  break;
}
// ... existing code ...
          case 'cloze':
            if (question.correctAnswer && userAnswer.blanks) {
              let correctCount = 0;
              question.correctAnswer.forEach((correct, blankIndex) => {
                if (userAnswer.blanks[blankIndex] && 
                    userAnswer.blanks[blankIndex].toLowerCase().trim() === 
                    correct.toLowerCase().trim()) {
                  correctCount++;
                }
              });
              score += (correctCount / question.correctAnswer.length) * (question.points || 1);
            }
            break;
          case 'comprehension':
            if (question.followUpQuestions && userAnswer.followUpAnswers) {
              let correctCount = 0;
              question.followUpQuestions.forEach((followUp, followUpIndex) => {
                const userFollowUpAnswer = userAnswer.followUpAnswers[followUpIndex];
                if (followUp.correctAnswer && userFollowUpAnswer === followUp.correctAnswer) {
                  correctCount++;
                }
              });
              score += (correctCount / question.followUpQuestions.length) * (question.points || 1);
            }
            break;
        }
      });
    }

    // Save response
    const response = new Response({
      formId,
      answers,
      score,
      maxScore,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await response.save();

    const responseData = {
      id: response._id,
      submitted: true
    };

    if (form.mode === 'test' && score !== null) {
      responseData.score = Math.round(score * 100) / 100;
      responseData.maxScore = maxScore;
      responseData.percentage = Math.round((score / maxScore) * 100);
      
      // Add correct answers for review
      if (form.settings.showResults) {
        responseData.correctAnswers = form.questions.map(q => q.correctAnswer);
      }
    }

    res.status(201).json(responseData);
  } catch (error) {
    console.error('Submit response error:', error);
    if (error.name === 'RateLimiterRes') {
      return res.status(429).json({ error: 'Too many submissions. Please try again later.' });
    }
    res.status(500).json({ error: 'Failed to save response' });
  }
});

// Get form responses (owner only)
router.get('/:formId', authenticateToken, async (req, res) => {
  try {
    // First verify the user owns this form
    const form = await Form.findOne({ 
      _id: req.params.formId, 
      userId: req.user.id 
    });
    
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Get responses
    const responses = await Response.find({ formId: req.params.formId })
      .select('_id answers score maxScore ipAddress createdAt')
      .sort({ createdAt: -1 });

    const formattedResponses = responses.map(response => ({
      id: response._id,
      answers: response.answers,
      score: response.score,
      maxScore: response.maxScore,
      ipAddress: response.ipAddress,
      submittedAt: response.createdAt
    }));

    res.json(formattedResponses);
  } catch (error) {
    console.error('Get responses error:', error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

export default router;