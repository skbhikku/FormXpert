/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  DndContext,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  DragOverlay,
  defaultDropAnimation,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { 
  Eye,
  Star,
  Clock,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Send,
  BookOpen,
  Type,
  LayoutGrid,
  GripVertical,
  User,
  AlertCircle,
  Trophy,
  CheckCircle,
  Book,
  List,
  Award,
  ArrowLeft,
  LayoutList,
  FileText,
  ListChecks
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Question {
  id: string;
  type: 'categorize' | 'cloze' | 'comprehension';
  title: string;
  description?: string;
  image?: string;
  points: number;
  items?: { id: string; text: string; categoryId?: string }[];
  categories?: { id: string; name: string; color: string }[];
  text?: string;
  blanks?: { id: string; answer: string; hint?: string }[];
  passage?: string;
  followUpQuestions?: { 
    id: string; 
    question: string; 
    options: { id: string; text: string }[]; 
    correctAnswer: string 
  }[];
}

interface FormData {
  title: string;
  description: string;
  headerImage: string;
  mode: 'survey' | 'test';
  questions: Question[];
  settings: {
    allowAnonymous: boolean;
    showResults: boolean;
    timeLimit?: number;
  };
}

interface Answer {
  questionId: string;
  type: 'categorize' | 'cloze' | 'comprehension';
  categorizedItems?: { itemId: string; categoryId: string }[];
  blankAnswers?: { blankId: string; answer: string }[];
  followUpAnswers?: { questionId: string; answer: string }[];
}

interface ItemObj {
  id: string;
  value: string;
  originalId?: string;
}

interface DraggableItemProps {
  id: string;
  value: string;
  color?: string;
  onRemove?: (id: string) => void;
  isDragging?: boolean;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ id, value, color, onRemove, isDragging }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    touchAction: 'none',
    WebkitUserSelect: 'none',
    backgroundColor: color || 'rgba(248, 250, 252, 0.8)',
    borderColor: color ? `${color}80` : 'rgba(226, 232, 240, 0.7)',
    boxShadow: isDragging ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 5px 10px -5px rgba(0, 0, 0, 0.04)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl p-3 transition-all select-none flex items-center justify-between backdrop-blur-sm ${
        color ? 'text-white' : 'bg-gradient-to-r from-slate-50/90 to-slate-100/90 border border-slate-200/50'
      } ${isDragging ? 'ring-2 ring-blue-500 z-50 scale-105' : ''}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center">
        <button
          type="button"
          aria-label="drag handle"
          {...attributes}
          {...listeners}
          className="mr-2 p-1 rounded-md hover:bg-black/5 focus:outline-none flex items-center justify-center cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-slate-500" />
        </button>

        <div className="text-sm font-medium truncate">{value}</div>
      </div>

      {onRemove && (
        <button
          type="button"
          aria-label="remove item"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRemove(id);
          }}
          className="ml-2 p-1 rounded-full hover:bg-black/5 focus:outline-none"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
      )}
    </motion.div>
  );
};

interface DroppableAvailableItemsProps {
  questionIndex: number;
  items: ItemObj[];
  isOver?: boolean;
}

const DroppableAvailableItems: React.FC<DroppableAvailableItemsProps> = ({ questionIndex, items, isOver }) => {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({ id: `available-${questionIndex}` });
  return (
    <div
      ref={setNodeRef}
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-h-20 p-4 rounded-2xl border-2 border-dashed transition-colors ${
        isDroppableOver || isOver ? 'border-blue-500 bg-blue-50/30 backdrop-blur-sm' : 'border-slate-200/50 bg-slate-50/30 backdrop-blur-sm'
      }`}
    >
      {items.length > 0 ? (
        items.map(item => (
          <DraggableItem key={item.id} id={item.id} value={item.value} />
        ))
      ) : (
        <motion.div 
          className="col-span-full flex flex-col items-center justify-center py-4 text-slate-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <List className="w-6 h-6 mb-2" />
          <p className="text-sm">All items have been categorized</p>
        </motion.div>
      )}
    </div>
  );
};

interface DroppableCategoryProps {
  questionIndex: number;
  categoryIndex: number;
  category: { name: string; color?: string };
  items: ItemObj[];
  onRemoveItem: (itemId: string) => void;
  isOver?: boolean;
}

const DroppableCategory: React.FC<DroppableCategoryProps> = ({ 
  questionIndex, 
  categoryIndex, 
  category, 
  items, 
  onRemoveItem,
  isOver
}) => {
  const droppableId = `category-${questionIndex}-${categoryIndex}`;
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({ id: droppableId });
  
  return (
    <motion.div
      ref={setNodeRef}
      className={`rounded-2xl p-4 min-h-32 transition-all bg-gradient-to-br from-white/80 to-slate-50/80 backdrop-blur-sm ${
        isDroppableOver || isOver ? 'ring-2 ring-blue-500 bg-blue-50/30' : 'shadow-sm border border-slate-200/50'
      }`}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center mb-3">
        {category.color && (
          <div 
            className="w-3 h-3 rounded-full mr-2" 
            style={{ backgroundColor: category.color }}
          />
        )}
        <h5 className="font-semibold text-slate-800">{category.name}</h5>
      </div>
      <div className="space-y-2">
        {items.length > 0 ? (
          items.map(item => (
            <DraggableItem 
              key={item.id} 
              id={item.id} 
              value={item.value} 
              color={category.color}
              onRemove={onRemoveItem} 
            />
          ))
        ) : (
          <motion.div 
            className="text-center py-4 text-slate-400 text-sm rounded-lg bg-slate-100/30 border border-dashed border-slate-300/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <p>Drop items here</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

const FormView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userName, setUserName] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [availableItems, setAvailableItems] = useState<{ [key: number]: ItemObj[] }>({});
  const [categorizedItems, setCategorizedItems] = useState<{ [key: number]: { [categoryIndex: number]: ItemObj[] } }>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const dropAnimation = {
    ...defaultDropAnimation,
    dragSourceOpacity: 0.5,
  };

  useEffect(() => {
    if (id) {
      fetchForm();
    }
  }, [id]);

  useEffect(() => {
    if (!formData?.settings.timeLimit) return;

    setTimeLeft(formData.settings.timeLimit * 60);
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [formData?.settings.timeLimit]);

  const fetchForm = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/forms/${id}`);
      setFormData(response.data);
      initializeAnswers(response.data.questions);
      calculateTotalScore(response.data.questions);
      initializeCategorizeState(response.data.questions);
    } catch (error) {
      toast.error('Failed to load form');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const initializeCategorizeState = (questions: Question[]) => {
    const initialAvailable: { [key: number]: ItemObj[] } = {};
    const initialCategorized: { [key: number]: { [categoryIndex: number]: ItemObj[] } } = {};
    
    questions.forEach((question, index) => {
      if (question.type === 'categorize') {
        initialAvailable[index] = (question.items || []).map((item) => ({
          id: `q${index}-i${item.id}`,
          originalId: item.id,
          value: item.text,
        }));
        
        initialCategorized[index] = {};
        question.categories?.forEach((_, catIndex) => {
          initialCategorized[index][catIndex] = [];
        });
      }
    });
    
    setAvailableItems(initialAvailable);
    setCategorizedItems(initialCategorized);
  };

  const initializeAnswers = (questions: Question[]) => {
    const initialAnswers: Answer[] = questions.map(question => {
      const baseAnswer = { questionId: question.id, type: question.type };
      
      switch (question.type) {
        case 'categorize':
          return {
            ...baseAnswer,
            categorizedItems: []
          };
        case 'cloze':
          return {
            ...baseAnswer,
            blankAnswers: question.blanks?.map(blank => ({
              blankId: blank.id,
              answer: ''
            })) || []
          };
        case 'comprehension':
          return {
            ...baseAnswer,
            followUpAnswers: question.followUpQuestions?.map(fq => ({
              questionId: fq.id,
              answer: ''
            })) || []
          };
        default:
          return baseAnswer;
      }
    });
    
    setAnswers(initialAnswers);
  };

  const calculateTotalScore = (questions: Question[]) => {
    const total = questions.reduce((sum, question) => sum + question.points, 0);
    setTotalScore(total);
  };

  const handleNextQuestion = () => {
    if (formData && currentQuestionIndex < formData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const findItemObj = (questionIndex: number, itemId: string): ItemObj | undefined => {
    const avail = availableItems[questionIndex] || [];
    const foundInAvail = avail.find(i => i.id === itemId);
    if (foundInAvail) return foundInAvail;
    
    const cats = categorizedItems[questionIndex] || {};
    for (const k of Object.keys(cats)) {
      const arr = cats[Number(k)] || [];
      const found = arr.find(i => i.id === itemId);
      if (found) return found;
    }
    
    return undefined;
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent, questionIndex: number) => {
    const { active, over } = event;
    if (!over || !formData) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const question = formData.questions[questionIndex];
    if (!question || question.type !== 'categorize') {
      setActiveId(null);
      return;
    }

    const currentAvailable = [...(availableItems[questionIndex] || [])];
    const currentCategorized = { ...(categorizedItems[questionIndex] || {}) };

    const newCategorized: { [key: number]: ItemObj[] } = {};
    (question.categories || []).forEach((_, catIdx) => {
      newCategorized[catIdx] = [...(currentCategorized[catIdx] || [])];
    });

    let newAvailable = currentAvailable.filter(i => i.id !== activeId);
    Object.keys(newCategorized).forEach(catIdxStr => {
      const idx = Number(catIdxStr);
      newCategorized[idx] = newCategorized[idx].filter(i => i.id !== activeId);
    });

    const itemObj = findItemObj(questionIndex, activeId);
    if (!itemObj) {
      setActiveId(null);
      return;
    }

    if (overId.startsWith('category-')) {
      const parts = overId.split('-');
      if (parts.length >= 3) {
        const targetQuestionIndex = parseInt(parts[1], 10);
        const categoryIndex = parseInt(parts[2], 10);
        
        if (targetQuestionIndex === questionIndex) {
          newCategorized[categoryIndex] = [...(newCategorized[categoryIndex] || []), itemObj];
        }
      }
    } else if (overId === `available-${questionIndex}`) {
      newAvailable = [...newAvailable, itemObj];
    }

    setAvailableItems(prev => ({ ...prev, [questionIndex]: newAvailable }));
    setCategorizedItems(prev => ({ ...prev, [questionIndex]: newCategorized }));

    // Update answers
    setAnswers(prev => {
      const newAnswers = [...prev];
      const answerIndex = newAnswers.findIndex(a => a.questionId === question.id);
      
      if (answerIndex === -1) return prev;
      
      const categorizedItemsArray: { itemId: string; categoryId: string }[] = [];
      
      Object.entries(newCategorized).forEach(([catIdx, items]) => {
        const category = question.categories?.[parseInt(catIdx)];
        if (category) {
          items.forEach(item => {
            categorizedItemsArray.push({
              itemId: item.originalId || item.id,
              categoryId: category.id
            });
          });
        }
      });
      
      newAnswers[answerIndex] = {
        ...newAnswers[answerIndex],
        categorizedItems: categorizedItemsArray
      };
      
      return newAnswers;
    });

    setActiveId(null);
  };

  const moveItemToAvailable = (questionIndex: number, itemId: string) => {
    const question = formData?.questions[questionIndex];
    if (!question || question.type !== 'categorize') return;

    const currentAvailable = [...(availableItems[questionIndex] || [])];
    const currentCategorized = { ...(categorizedItems[questionIndex] || {}) };

    const newCategorized: { [key: number]: ItemObj[] } = {};
    (question.categories || []).forEach((_, catIdx) => {
      newCategorized[catIdx] = (currentCategorized[catIdx] || []).filter(i => i.id !== itemId);
    });

    const itemObj = findItemObj(questionIndex, itemId);
    if (!itemObj) return;

    const existsInAvailable = currentAvailable.some(i => i.id === itemId);
    const newAvailable = existsInAvailable ? currentAvailable : [...currentAvailable, itemObj];

    setAvailableItems(prev => ({ ...prev, [questionIndex]: newAvailable }));
    setCategorizedItems(prev => ({ ...prev, [questionIndex]: newCategorized }));

    // Update answers
    setAnswers(prev => {
      const newAnswers = [...prev];
      const answerIndex = newAnswers.findIndex(a => a.questionId === question.id);
      
      if (answerIndex === -1) return prev;
      
      newAnswers[answerIndex] = {
        ...newAnswers[answerIndex],
        categorizedItems: (newAnswers[answerIndex].categorizedItems || []).filter(
          ci => ci.itemId !== (itemObj.originalId || itemObj.id)
        )
      };
      
      return newAnswers;
    });
  };

  const handleClozeAnswer = (questionIndex: number, blankIndex: number, value: string) => {
    setAnswers(prev => {
      const newAnswers = [...prev];
      const questionId = formData?.questions[questionIndex]?.id;
      if (!questionId) return prev;
      
      const answerIndex = newAnswers.findIndex(a => a.questionId === questionId);
      if (answerIndex === -1) return prev;
      
      const blankId = formData?.questions[questionIndex]?.blanks?.[blankIndex]?.id;
      if (!blankId) return prev;
      
      if (!newAnswers[answerIndex].blankAnswers) {
        newAnswers[answerIndex].blankAnswers = [];
      }
      
      const blankAnswers = [...(newAnswers[answerIndex].blankAnswers || [])];
      const blankIndexInArray = blankAnswers.findIndex(ba => ba.blankId === blankId);
      
      if (blankIndexInArray >= 0) {
        blankAnswers[blankIndexInArray].answer = value;
      } else {
        blankAnswers.push({ blankId, answer: value });
      }
      
      newAnswers[answerIndex].blankAnswers = blankAnswers;
      return newAnswers;
    });
  };

  const handleFollowUpAnswer = (questionIndex: number, followUpIndex: number, value: string) => {
    setAnswers(prev => {
      const newAnswers = [...prev];
      const questionId = formData?.questions[questionIndex]?.id;
      if (!questionId) return prev;
      
      const answerIndex = newAnswers.findIndex(a => a.questionId === questionId);
      if (answerIndex === -1) return prev;
      
      const followUpId = formData?.questions[questionIndex]?.followUpQuestions?.[followUpIndex]?.id;
      if (!followUpId) return prev;
      
      if (!newAnswers[answerIndex].followUpAnswers) {
        newAnswers[answerIndex].followUpAnswers = [];
      }
      
      const followUpAnswers = [...(newAnswers[answerIndex].followUpAnswers || [])];
      const followUpIndexInArray = followUpAnswers.findIndex(fua => fua.questionId === followUpId);
      
      if (followUpIndexInArray >= 0) {
        followUpAnswers[followUpIndexInArray].answer = value;
      } else {
        followUpAnswers.push({ questionId: followUpId, answer: value });
      }
      
      newAnswers[answerIndex].followUpAnswers = followUpAnswers;
      return newAnswers;
    });
  };

  const calculateScore = () => {
    if (!formData) return 0;
    
    let calculatedScore = 0;
    
    formData.questions.forEach(question => {
      const answer = answers.find(a => a.questionId === question.id);
      if (!answer) return;
      
      switch (question.type) {
        case 'categorize':
          if (answer.categorizedItems) {
            const correctItems = question.items?.filter(item => {
              const userAnswer = answer.categorizedItems?.find(ci => ci.itemId === item.id);
              return userAnswer?.categoryId === item.categoryId;
            }) || [];
            
            if (question.items?.length) {
              calculatedScore += (correctItems.length / question.items.length) * question.points;
            }
          }
          break;
          
        case 'cloze':
          if (answer.blankAnswers) {
            const correctBlanks = question.blanks?.filter(blank => {
              const userAnswer = answer.blankAnswers?.find(ba => ba.blankId === blank.id);
              return userAnswer?.answer.toLowerCase() === blank.answer.toLowerCase();
            }) || [];
            
            if (question.blanks?.length) {
              calculatedScore += (correctBlanks.length / question.blanks.length) * question.points;
            }
          }
          break;
          
        case 'comprehension':
          if (answer.followUpAnswers) {
            const correctFollowUps = question.followUpQuestions?.filter(fq => {
              const userAnswer = answer.followUpAnswers?.find(fua => fua.questionId === fq.id);
              return userAnswer?.answer === fq.correctAnswer;
            }) || [];
            
            if (question.followUpQuestions?.length) {
              calculatedScore += (correctFollowUps.length / question.followUpQuestions.length) * question.points;
            }
          }
          break;
      }
    });
    
    return Math.round(calculatedScore);
  };

  const handleSubmit = async () => {
    if (!formData) return;
    
    // Validate required fields if in test mode
    if (formData.mode === 'test') {
      const hasEmptyAnswers = answers.some(answer => {
        if (answer.type === 'categorize') {
          const question = formData.questions.find(q => q.id === answer.questionId);
          return answer.categorizedItems?.length !== question?.items?.length;
        } else if (answer.type === 'cloze') {
          return answer.blankAnswers?.some(ba => !ba.answer.trim());
        } else if (answer.type === 'comprehension') {
          return answer.followUpAnswers?.some(fua => !fua.answer);
        }
        return false;
      });
      
      if (hasEmptyAnswers) {
        toast.error('Please answer all questions before submitting');
        return;
      }
    }
    
    setSubmitting(true);
    try {
      const calculatedScore = calculateScore();
      
      // CORRECTED ENDPOINT: Using /view to match backend
      const response = await axios.post(`/responses/${id}/view`, {
        userName: formData.settings.allowAnonymous ? 'Anonymous' : userName,
        answers,
        score: formData.mode === 'test' ? calculatedScore : undefined
      });
      
      if (formData.settings.showResults) {
        setScore(calculatedScore);
        setShowResults(true);
      } else {
        toast.success('Response submitted successfully');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const renderQuestion = () => {
    if (!formData || currentQuestionIndex >= formData.questions.length) return null;
    
    const question = formData.questions[currentQuestionIndex];
    
    switch (question.type) {
      case 'categorize':
        return (
          <CategorizeQuestion
            question={question}
            questionIndex={currentQuestionIndex}
            availableItems={availableItems[currentQuestionIndex] || []}
            categorizedItems={categorizedItems[currentQuestionIndex] || {}}
            handleDragStart={handleDragStart}
            handleDragEnd={(e) => handleDragEnd(e, currentQuestionIndex)}
            moveItemToAvailable={(itemId) => moveItemToAvailable(currentQuestionIndex, itemId)}
            activeId={activeId}
            dropAnimation={dropAnimation}
            sensors={sensors}
          />
        );
        
      case 'cloze':
        return (
          <ClozeQuestion
            question={question}
            questionIndex={currentQuestionIndex}
            answer={answers.find(a => a.questionId === question.id)}
            onChange={handleClozeAnswer}
          />
        );
        
      case 'comprehension':
        return (
          <ComprehensionQuestion
            question={question}
            questionIndex={currentQuestionIndex}
            answer={answers.find(a => a.questionId === question.id)}
            onChange={handleFollowUpAnswer}
          />
        );
        
      default:
        return null;
    }
  };

  if (loading || !formData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <motion.div
          animate={{ 
            rotate: 360,
            transition: { 
              duration: 1, 
              repeat: Infinity,
              ease: "linear"
            } 
          }}
          className="w-16 h-16 rounded-full border-t-4 border-b-4 border-blue-500"
        />
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div 
            className="bg-white rounded-3xl shadow-xl overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-8 text-center text-white">
              <motion.div 
                className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                {formData.mode === 'test' ? (
                  <Trophy className="w-12 h-12 text-yellow-300" strokeWidth={1.5} />
                ) : (
                  <CheckCircle className="w-12 h-12 text-green-300" strokeWidth={1.5} />
                )}
              </motion.div>
              
              <motion.h1 
                className="text-3xl font-bold mb-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {formData.mode === 'test' ? 'Test Submitted!' : 'Response Recorded!'}
              </motion.h1>
              
              <motion.p 
                className="text-indigo-200 text-lg max-w-md mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                    {formData.mode === 'test'
                      ? (
                        <>
                          Your answers have been submitted for grading.<br />
                          Like this test form will be work — your submitted data will not be stored 
                          for review only we show the result from the form answer compared.<br />
                          Public form data will be stored and shown in the response page.
                        </>
                      )
                      : (
                        <>
                          Thank you for completing this survey.<br />
                          Like this survey form will be work — your submitted data will not be stored 
                          this is only for review.<br />
                          Public form data will be stored and shown in the response page.
                        </>
                      )
                    }

              </motion.p>
            </div>

            <div className="p-8">
              {formData.mode === 'test' && (
                <motion.div 
                  className="mb-8 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <motion.div 
                    className="inline-flex items-center justify-center bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-5xl font-bold rounded-full w-36 h-36 mb-6 mx-auto"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.6, type: "spring" }}
                  >
                    {Math.round((score / totalScore) * 100)}%
                  </motion.div>
                  <motion.h2 
                    className="text-2xl font-bold text-slate-800 mb-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    {Math.round((score / totalScore) * 100) >= 80 ? 'Excellent!' : 
                     Math.round((score / totalScore) * 100) >= 60 ? 'Good Job!' : 'Keep Practicing!'}
                  </motion.h2>
                  <motion.p 
                    className="text-slate-600"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    You scored {score} out of {totalScore} points
                  </motion.p>
                </motion.div>
              )}

              <motion.div 
                className="mt-10 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                <motion.button
                  onClick={() => navigate('/dashboard')}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-medium shadow-lg"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Return to Dashboard
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Form Header */}
        <motion.div 
          className="bg-white rounded-3xl shadow-xl overflow-hidden mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {formData.headerImage && (
            <div className="relative h-56 w-full overflow-hidden">
              <img 
                src={formData.headerImage} 
                alt="Form header" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          )}
          
          <div className="p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <motion.h1 
                className="text-3xl font-bold text-slate-900 mb-4 sm:mb-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {formData.title}
              </motion.h1>
              <div className="flex items-center space-x-2">
                <motion.span 
                  className={`px-4 py-1.5 text-sm font-medium rounded-full shadow-sm ${
                    formData.mode === 'test' 
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white' 
                      : 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white'
                  }`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {formData.mode === 'test' ? 'Test' : 'Survey'}
                </motion.span>
                {formData.settings.timeLimit && (
                  <motion.span 
                    className="px-4 py-1.5 bg-gradient-to-r from-slate-600 to-slate-700 text-white text-sm font-medium rounded-full shadow-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Clock className="inline-block w-4 h-4 mr-1" />
                    {timeLeft !== null ? formatTime(timeLeft) : `${formData.settings.timeLimit}:00`}
                  </motion.span>
                )}
              </div>
            </div>
            
            {formData.description && (
              <motion.p 
                className="text-slate-600 mb-8 text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {formData.description}
              </motion.p>
            )}
            
            {formData.mode === 'test' && (
              <motion.div 
                className="flex items-start bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200/50 rounded-2xl p-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="bg-gradient-to-r from-yellow-400 to-amber-500 p-2 rounded-xl mr-4">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-800 mb-1">Test Mode</h3>
                  <p className="text-amber-700">
                    Your answers will be graded automatically. Read each question carefully.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* User Info (if not anonymous) */}
        {!formData.settings.allowAnonymous && (
          <motion.div 
            className="bg-white rounded-2xl shadow-sm p-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <label className="block text-lg font-medium text-slate-800 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-500" />
              Your Information
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-lg"
              placeholder="Enter your name"
              required
            />
          </motion.div>
        )}

        {/* Progress Indicator */}
        <motion.div 
          className="flex items-center justify-between mb-8 bg-white rounded-2xl shadow-sm p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex-1 bg-slate-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full" 
              style={{ 
                width: `${((currentQuestionIndex + 1) / formData.questions.length) * 100}%` 
              }}
            ></div>
          </div>
          <span className="ml-4 text-lg font-medium text-slate-800">
            {currentQuestionIndex + 1} / {formData.questions.length}
          </span>
        </motion.div>
        
        {/* Current Question */}
        <motion.div 
          className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          key={currentQuestionIndex}
        >
          {renderQuestion()}
        </motion.div>
        
        {/* Navigation Buttons */}
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <button
            onClick={handlePrevQuestion}
            disabled={currentQuestionIndex === 0}
            className={`flex items-center px-6 py-3 border border-slate-300 rounded-xl text-base font-medium ${
              currentQuestionIndex === 0 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Previous
          </button>
          
          {currentQuestionIndex < formData.questions.length - 1 ? (
            <button
              onClick={handleNextQuestion}
              className="flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              Next
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 ml-2" />
                  Submit
                </>
              )}
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
};

const CategorizeQuestion: React.FC<{
  question: Question;
  questionIndex: number;
  availableItems: ItemObj[];
  categorizedItems: { [key: number]: ItemObj[] };
  handleDragStart: (event: any) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  moveItemToAvailable: (itemId: string) => void;
  activeId: string | null;
  dropAnimation: any;
  sensors: any;
}> = ({ 
  question, 
  questionIndex,
  availableItems,
  categorizedItems,
  handleDragStart,
  handleDragEnd,
  moveItemToAvailable,
  activeId,
  dropAnimation,
  sensors
}) => {
  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl w-10 h-10 flex items-center justify-center mr-4">
            {questionIndex + 1}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{question.title}</h2>
            {question.description && (
              <p className="text-slate-600 mt-2">{question.description}</p>
            )}
          </div>
        </div>
        {question.points > 0 && (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800">
            <Star className="w-4 h-4 mr-1" />
            {question.points} point{question.points !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={availableItems?.map(i => i.id) || []}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-8">
            <div>
              <h4 className="font-bold text-slate-800 mb-4 flex items-center text-lg">
                <List className="w-5 h-5 mr-2 text-blue-500" />
                <span>Available Items</span>
              </h4>
              <DroppableAvailableItems
                questionIndex={questionIndex}
                items={availableItems}
              />
            </div>

            <div>
              <h4 className="font-bold text-slate-800 mb-4 flex items-center text-lg">
                <LayoutGrid className="w-5 h-5 mr-2 text-blue-500" />
                <span>Categories</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(question.categories || []).map((category, categoryIndex) => (
                  <DroppableCategory
                    key={category.id || categoryIndex}
                    questionIndex={questionIndex}
                    categoryIndex={categoryIndex}
                    category={category}
                    items={categorizedItems[categoryIndex] || []}
                    onRemoveItem={moveItemToAvailable}
                  />
                ))}
              </div>
            </div>
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeId ? (
            <DraggableItem 
              id={activeId} 
              value={availableItems.concat(...Object.values(categorizedItems)).find(i => i.id === activeId)?.value || ''} 
              isDragging 
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

const ClozeQuestion: React.FC<{
  question: Question;
  questionIndex: number;
  answer?: Answer;
  onChange: (questionIndex: number, blankIndex: number, value: string) => void;
}> = ({ question, questionIndex, answer, onChange }) => {
  const renderTextWithBlanks = () => {
    if (!question.text) return null;
    
    const parts = question.text.split(/(_{3,})/g);
    let blankIndex = 0;
    
    return (
      <div className="prose max-w-none text-slate-800 text-lg leading-relaxed">
        {parts.map((part, index) => {
          if (part.match(/^_{3,}$/)) {
            const blank = question.blanks?.[blankIndex];
            const userAnswer = answer?.blankAnswers?.find(ba => ba.blankId === blank?.id);
            blankIndex++;
            
            if (!blank) return <span key={index} className="text-red-500">[Missing blank]</span>;
            
            return (
              <span key={index} className="relative inline-block mx-1">
                <input
                  type="text"
                  value={userAnswer?.answer || ''}
                  onChange={(e) => onChange(questionIndex, blankIndex - 1, e.target.value)}
                  className="inline-block px-4 py-2 border-b-2 border-blue-400 bg-white focus:border-blue-600 focus:outline-none min-w-24 text-center shadow-sm rounded-t-xl"
                  placeholder="Answer"
                />
                {blank.hint && (
                  <span className="absolute -bottom-6 left-0 text-xs text-slate-500 w-full text-center">
                    Hint: {blank.hint}
                  </span>
                )}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl w-10 h-10 flex items-center justify-center mr-4">
            {questionIndex + 1}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{question.title}</h2>
            {question.description && (
              <p className="text-slate-600 mt-2">{question.description}</p>
            )}
          </div>
        </div>
        {question.points > 0 && (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800">
            <Star className="w-4 h-4 mr-1" />
            {question.points} point{question.points !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-2xl border border-slate-200/50 mb-6">
        <h4 className="font-bold text-slate-800 mb-4 flex items-center text-lg">
          <Type className="w-5 h-5 mr-2 text-blue-500" />
          <span>Fill in the Blanks</span>
        </h4>
        {renderTextWithBlanks()}
      </div>
    </div>
  );
};

const ComprehensionQuestion: React.FC<{
  question: Question;
  questionIndex: number;
  answer?: Answer;
  onChange: (questionIndex: number, followUpIndex: number, value: string) => void;
}> = ({ question, questionIndex, answer, onChange }) => {
  return (
    <div className="p-6 sm:p-8">
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl w-10 h-10 flex items-center justify-center mr-4">
            {questionIndex + 1}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{question.title}</h2>
            {question.description && (
              <p className="text-slate-600 mt-2">{question.description}</p>
            )}
          </div>
        </div>
        {question.points > 0 && (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800">
            <Star className="w-4 h-4 mr-1" />
            {question.points} point{question.points !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-2xl border border-slate-200/50 mb-6">
        <h4 className="font-bold text-slate-800 mb-4 flex items-center text-lg">
          <BookOpen className="w-5 h-5 mr-2 text-blue-500" />
          <span>Reading Passage</span>
        </h4>
        <div className="prose max-w-none text-slate-800">
          {question.passage || <span className="text-slate-400 italic">No passage provided</span>}
        </div>
      </div>

      <div className="space-y-6">
        <h4 className="font-bold text-slate-800 flex items-center text-lg">
          <FileText className="w-5 h-5 mr-2 text-blue-500" />
          <span>Questions</span>
        </h4>
        {(question.followUpQuestions || []).map((followUp, followUpIndex) => {
          const userAnswer = answer?.followUpAnswers?.find(fua => fua.questionId === followUp.id);
          
          return (
            <motion.div 
              key={followUp.id || followUpIndex} 
              className="bg-gradient-to-br from-white to-slate-50 border border-slate-200/50 rounded-2xl p-6"
              whileHover={{ y: -5 }}
            >
              <h5 className="font-bold text-slate-800 mb-4 flex items-center">
                <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full w-7 h-7 flex items-center justify-center mr-3">
                  {followUpIndex + 1}
                </span>
                <span>{followUp.question}</span>
              </h5>
              <div className="space-y-3 ml-10">
                {followUp.options.map((option) => (
                  <motion.label 
                    key={option.id} 
                    className="flex items-center space-x-4 p-4 hover:bg-slate-100/50 rounded-xl cursor-pointer transition-colors border border-slate-200/50"
                    whileHover={{ x: 5 }}
                  >
                    <input
                      type="radio"
                      name={`question-${questionIndex}-followup-${followUpIndex}`}
                      value={option.id}
                      checked={userAnswer?.answer === option.id}
                      onChange={() => onChange(questionIndex, followUpIndex, option.id)}
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-800">{option.text}</span>
                  </motion.label>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default FormView;
