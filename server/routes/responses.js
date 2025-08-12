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

    let score = 0;
    let maxScore = 0;
    const correctAnswers = [];

    // Calculate score for test mode
    if (form.mode === 'test') {
      form.questions.forEach((question, index) => {
        const userAnswer = answers[index];
        if (!userAnswer) return;

        maxScore += question.points || 1;

        switch (question.type) {
          case 'categorize': {
            if (userAnswer.categories) {
              // Build correct answer structure from items and categories
              const correctCategoryMap = {};
              question.categories.forEach(cat => {
                correctCategoryMap[cat.id] = [];
              });
              
              question.items.forEach(item => {
                if (item.categoryId && correctCategoryMap[item.categoryId]) {
                  correctCategoryMap[item.categoryId].push(item.text);
                }
              });
              
              // Convert to array and sort each category
              const correctAnswer = Object.values(correctCategoryMap).map(cat => 
                cat.sort()
              );
              
              // Sort user's categories for accurate comparison
              const sortedUserAnswer = userAnswer.categories.map(cat => 
                [...cat].sort()
              );
              
              let correctCount = 0;
              
              // Compare sorted categories
              correctAnswer.forEach((correctCat, catIndex) => {
                const userCat = sortedUserAnswer[catIndex] || [];
                if (
                  userCat.length === correctCat.length &&
                  userCat.every((val, i) => val === correctCat[i])
                ) {
                  correctCount++;
                }
              });
              
              // Calculate partial credit
              if (correctAnswer.length > 0) {
                score += (correctCount / correctAnswer.length) * (question.points || 1);
              }
              correctAnswers.push(correctAnswer);
            }
            break;
          }
            
          case 'cloze': {
            if (question.blanks && userAnswer.blanks) {
              const correctBlanks = question.blanks.map(b => b.answer);
              let correctCount = 0;
              
              userAnswer.blanks.forEach((userBlank, blankIndex) => {
                if (userBlank && correctBlanks[blankIndex] && 
                    userBlank.trim().toLowerCase() === correctBlanks[blankIndex].trim().toLowerCase()) {
                  correctCount++;
                }
              });
              
              // Calculate partial credit
              if (correctBlanks.length > 0) {
                score += (correctCount / correctBlanks.length) * (question.points || 1);
              }
              correctAnswers.push(correctBlanks);
            }
            break;
          }
            
          case 'comprehension': {
            if (question.followUpQuestions && userAnswer.followUpAnswers) {
              const correctOptions = question.followUpQuestions.map(fq => {
                const correctOption = fq.options.find(opt => opt.id === fq.correctAnswer);
                return correctOption ? correctOption.text : '';
              });
              
              let correctCount = 0;
              userAnswer.followUpAnswers.forEach((userAnswerId, fqIndex) => {
                if (question.followUpQuestions[fqIndex] && 
                    userAnswerId === question.followUpQuestions[fqIndex].correctAnswer) {
                  correctCount++;
                }
              });
              
              // Calculate partial credit
              if (question.followUpQuestions.length > 0) {
                score += (correctCount / question.followUpQuestions.length) * (question.points || 1);
              }
              correctAnswers.push(correctOptions);
            }
            break;
          }
        }
      });
    }

    // Save response
    const response = new Response({
      formId,
      answers,
      score: Math.round(score * 100) / 100,  // Round to 2 decimals
      maxScore,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await response.save();

    const responseData = {
      submitted: true
    };

    if (form.mode === 'test') {
      responseData.score = Math.round(score * 100) / 100;
      responseData.maxScore = maxScore;
      responseData.percentage = Math.round((score / maxScore) * 100);
      
      // Add correct answers for review if enabled
      if (form.settings.showResults) {
        responseData.correctAnswers = correctAnswers;
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


//User form view endpoint and test view endpoint for the review
router.post('/:formId/view', async (req, res) => {
  try {
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

    let score = 0;
    let maxScore = 0;
    const correctAnswers = [];

    // Calculate score for test mode
    if (form.mode === 'test') {
      form.questions.forEach((question, index) => {
        const userAnswer = answers[index];
        if (!userAnswer) return;

        maxScore += question.points || 1;

        switch (question.type) {
          case 'categorize': {
            if (userAnswer.categories) {
              // Build correct answer structure from items and categories
              const correctCategoryMap = {};
              question.categories.forEach(cat => {
                correctCategoryMap[cat.id] = [];
              });
              
              question.items.forEach(item => {
                if (item.categoryId && correctCategoryMap[item.categoryId]) {
                  correctCategoryMap[item.categoryId].push(item.text);
                }
              });
              
              // Convert to array and sort each category
              const correctAnswer = Object.values(correctCategoryMap).map(cat => 
                cat.sort()
              );
              
              // Sort user's categories for accurate comparison
              const sortedUserAnswer = userAnswer.categories.map(cat => 
                [...cat].sort()
              );
              
              let correctCount = 0;
              
              // Compare sorted categories
              correctAnswer.forEach((correctCat, catIndex) => {
                const userCat = sortedUserAnswer[catIndex] || [];
                if (
                  userCat.length === correctCat.length &&
                  userCat.every((val, i) => val === correctCat[i])
                ) {
                  correctCount++;
                }
              });
              
              // Calculate partial credit
              if (correctAnswer.length > 0) {
                score += (correctCount / correctAnswer.length) * (question.points || 1);
              }
              correctAnswers.push(correctAnswer);
            }
            break;
          }
            
          case 'cloze': {
            if (question.blanks && userAnswer.blanks) {
              const correctBlanks = question.blanks.map(b => b.answer);
              let correctCount = 0;
              
              userAnswer.blanks.forEach((userBlank, blankIndex) => {
                if (userBlank && correctBlanks[blankIndex] && 
                    userBlank.trim().toLowerCase() === correctBlanks[blankIndex].trim().toLowerCase()) {
                  correctCount++;
                }
              });
              
              // Calculate partial credit
              if (correctBlanks.length > 0) {
                score += (correctCount / correctBlanks.length) * (question.points || 1);
              }
              correctAnswers.push(correctBlanks);
            }
            break;
          }
            
          case 'comprehension': {
            if (question.followUpQuestions && userAnswer.followUpAnswers) {
              const correctOptions = question.followUpQuestions.map(fq => {
                const correctOption = fq.options.find(opt => opt.id === fq.correctAnswer);
                return correctOption ? correctOption.text : '';
              });
              
              let correctCount = 0;
              userAnswer.followUpAnswers.forEach((userAnswerId, fqIndex) => {
                if (question.followUpQuestions[fqIndex] && 
                    userAnswerId === question.followUpQuestions[fqIndex].correctAnswer) {
                  correctCount++;
                }
              });
              
              // Calculate partial credit
              if (question.followUpQuestions.length > 0) {
                score += (correctCount / question.followUpQuestions.length) * (question.points || 1);
              }
              correctAnswers.push(correctOptions);
            }
            break;
          }
        }
      });
    }

    // Prepare response without saving to database
    const responseData = {
      submitted: true,
      message: 'Form submitted successfully! This was a test view - responses were not stored.'
    };

    if (form.mode === 'test') {
      responseData.score = Math.round(score * 100) / 100;
      responseData.maxScore = maxScore;
      responseData.percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      
      // Add correct answers for review if enabled
      if (form.settings.showResults) {
        responseData.correctAnswers = correctAnswers;
      }
    }
    
    res.status(200).json(responseData);
  } catch (error) {
    console.error('Form test view error:', error);
    res.status(500).json({ 
      error: 'Failed to process form test view',
      details: error.message
    });
  }
});


// Delete a single response
router.delete('/:id', async (req, res) => {
  try {
    const response = await Response.findById(req.params.id);
    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    // Delete the response
    await Response.deleteOne({ _id: req.params.id });

    // Update form response count
    await Form.findByIdAndUpdate(response.formId, {
      $inc: { responseCount: -1 }
    });

    res.status(200).json({ message: 'Response deleted successfully' });
  } catch (error) {
    console.error('Delete response error:', error);
    res.status(500).json({ error: 'Failed to delete response' });
  }
});

// Delete all responses for a form
router.delete('/form/:formId', async (req, res) => {
  try {
    const formId = req.params.formId;
    
    // Delete all responses for this form
    await Response.deleteMany({ formId });

    // Reset form response count
    await Form.findByIdAndUpdate(formId, {
      responseCount: 0
    });

    res.status(200).json({ message: 'All responses deleted successfully' });
  } catch (error) {
    console.error('Delete all responses error:', error);
    res.status(500).json({ error: 'Failed to delete responses' });
  }
});


export default router;
