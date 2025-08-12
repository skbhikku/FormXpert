/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
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
  DragOverEvent,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  CheckCircle, 
  Clock, 
  Trophy, 
  BookOpen, 
  GripVertical, 
  X,
  List,
  Type,
  FileText,
  Award,
  ChevronRight,
  ArrowLeft,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Question {
  id: string;
  type: 'categorize' | 'cloze' | 'comprehension';
  title: string;
  description?: string;
  image?: string;
  points: number;
  items?: {
    id: string;
    text: string;
    categoryId?: string;
    _id?: { $oid: string };
  }[];
  categories?: {
    id: string;
    name: string;
    color?: string;
    _id?: { $oid: string };
  }[];
  correctAnswer?: unknown;
  text?: string;
  blanks?: {
    id: string;
    answer: string;
    hint?: string;
    _id?: { $oid: string };
  }[];
  passage?: string;
  followUpQuestions?: {
    id: string;
    question: string;
    options: {
      id: string;
      text: string;
      _id?: { $oid: string };
    }[];
    correctAnswer: string;
    _id?: { $oid: string };
  }[];
}

interface FormData {
  id: string;
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

interface SubmissionResult {
  submitted: boolean;
  score?: number;
  maxScore?: number;
  percentage?: number;
  correctAnswers?: unknown[];
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
    backgroundColor: color ,
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
          title="Remove item"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      )}
    </motion.div>
  );
};

interface DroppableAvailableItemsProps {
  id: string;
  items: ItemObj[];
}

const DroppableAvailableItems: React.FC<DroppableAvailableItemsProps> = ({ id, items }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div
      ref={setNodeRef}
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-h-20 p-4 rounded-2xl border-2 border-dashed transition-colors ${
        isOver ? 'border-blue-500 bg-blue-50/30 backdrop-blur-sm' : 'border-slate-200/50 bg-slate-50/30 backdrop-blur-sm'
      }`}
    >
      {items.length > 0 ? (
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <DraggableItem key={item.id} id={item.id} value={item.value} />
          ))}
        </SortableContext>
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
  id: string;
  category: { name: string; color?: string };
  items: ItemObj[];
  onRemoveItem: (itemId: string) => void;
}

const DroppableCategory: React.FC<DroppableCategoryProps> = ({ 
  id,
  category, 
  items, 
  onRemoveItem
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <motion.div
      ref={setNodeRef}
      className={`rounded-2xl p-4 transition-all bg-gradient-to-br from-white/80 to-slate-50/80 backdrop-blur-sm shadow-sm border border-slate-200/50 ${
        isOver ? 'ring-2' : ''
      }`}
      style={isOver ? { 
        boxShadow: `inset 0 0 0 2px ${category.color || '#3b82f6'}`,
        border: '1px solid transparent'
      } : undefined}
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
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {items.length > 0 ? (
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {items.map(item => (
              <DraggableItem 
                key={item.id} 
                id={item.id} 
                value={item.value} 
                color={category.color}
                onRemove={onRemoveItem} 
              />
            ))}
          </SortableContext>
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

const PublicForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<ItemObj | null>(null);
  
  type CategorizeAnswer = { categories: string[][] };
  type ClozeAnswer = { blanks: string[] };
  type ComprehensionAnswer = { followUpAnswers: string[] };
  type Answer = CategorizeAnswer | ClozeAnswer | ComprehensionAnswer | undefined;
  
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
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

   const fetchForm = useCallback(async () => {
    try {
      const response = await axios.get(`/forms/${id}/public`);
      setForm(response.data);
      
      const initialAnswers: Record<number, Answer> = {};
      const initialAvailable: { [key: number]: ItemObj[] } = {};
      const initialCategorized: { [key: number]: { [categoryIndex: number]: ItemObj[] } } = {};
      
      response.data.questions.forEach((question: Question, index: number) => {
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
          initialAnswers[index] = { categories: [] };
        } else if (question.type === 'cloze') {
          initialAnswers[index] = { 
            blanks: new Array(question.blanks?.length || 0).fill('') 
          };
        } else if (question.type === 'comprehension') {
          initialAnswers[index] = { 
            followUpAnswers: new Array(question.followUpQuestions?.length || 0).fill('') 
          };
        }
      });
      
      setAnswers(initialAnswers);
      setAvailableItems(initialAvailable);
      setCategorizedItems(initialCategorized);
    } catch {
      toast.error('Form not found or no longer available');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchForm();
    }
  }, [id, fetchForm]);

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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // Find the active item in all possible locations
    for (const questionIndex in availableItems) {
      const item = availableItems[Number(questionIndex)].find(i => i.id === active.id);
      if (item) {
        setActiveItem(item);
        return;
      }
    }
    
    for (const questionIndex in categorizedItems) {
      const cats = categorizedItems[Number(questionIndex)];
      for (const categoryIndex in cats) {
        const item = cats[Number(categoryIndex)].find(i => i.id === active.id);
        if (item) {
          setActiveItem(item);
          return;
        }
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !form) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find which question we're dealing with
    const questionIndexMatch = activeId.match(/q(\d+)-/);
    if (!questionIndexMatch) return;
    const questionIndex = parseInt(questionIndexMatch[1], 10);
    
    const question = form.questions[questionIndex];
    if (!question || question.type !== 'categorize') return;

    if (overId.startsWith('category-')) {
      const parts = overId.split('-');
      if (parts.length >= 3) {
        const targetQuestionIndex = parseInt(parts[1], 10);
        const categoryIndex = parseInt(parts[2], 10);
        
        if (targetQuestionIndex !== questionIndex) return;

        setCategorizedItems(prev => {
          const current = { ...(prev[questionIndex] || {}) };
          
          // Remove item from all categories and available
          for (const catIndex of Object.keys(current)) {
            current[Number(catIndex)] = current[Number(catIndex)].filter(i => i.id !== activeId);
          }
          
          // Add to target category
          if (!current[categoryIndex]) current[categoryIndex] = [];
          const item = findItemObj(questionIndex, activeId);
          if (item && !current[categoryIndex].some(i => i.id === activeId)) {
            current[categoryIndex] = [...current[categoryIndex], item];
          }
          
          return { ...prev, [questionIndex]: current };
        });
        
        setAvailableItems(prev => ({
          ...prev,
          [questionIndex]: (prev[questionIndex] || []).filter(i => i.id !== activeId)
        }));
      }
    } else if (overId.startsWith('available-')) {
      const parts = overId.split('-');
      if (parts.length >= 2) {
        const targetQuestionIndex = parseInt(parts[1], 10);
        if (targetQuestionIndex !== questionIndex) return;
        
        setAvailableItems(prev => {
          const current = [...(prev[questionIndex] || [])];
          const item = findItemObj(questionIndex, activeId);
          if (item && !current.some(i => i.id === activeId)) {
            return { ...prev, [questionIndex]: [...current, item] };
          }
          return prev;
        });
        
        setCategorizedItems(prev => {
          const current = { ...(prev[questionIndex] || {}) };
          for (const catIndex of Object.keys(current)) {
            current[Number(catIndex)] = current[Number(catIndex)].filter(i => i.id !== activeId);
          }
          return { ...prev, [questionIndex]: current };
        });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !form) {
      setActiveId(null);
      setActiveItem(null);
      return;
    }

    const activeId = active.id as string;

    const questionIndexMatch = activeId.match(/q(\d+)-/);
    if (!questionIndexMatch) return;
    const questionIndex = parseInt(questionIndexMatch[1], 10);
    
    const question = form.questions[questionIndex];
    if (!question || question.type !== 'categorize') {
      setActiveId(null);
      setActiveItem(null);
      return;
    }

    // Update answers
    const categoriesArray = (question.categories || []).map((_, idx) =>
      (categorizedItems[questionIndex]?.[idx] || []).map(it => it.originalId || it.id)
    );

    setAnswers(prev => ({
      ...prev,
      [questionIndex]: { categories: categoriesArray }
    }));

    setActiveId(null);
    setActiveItem(null);
  };

  const moveItemToAvailable = (questionIndex: number, itemId: string) => {
    const question = form?.questions[questionIndex];
    if (!question || question.type !== 'categorize') return;

    setCategorizedItems(prev => {
      const current = { ...(prev[questionIndex] || {}) };
      for (const catIndex of Object.keys(current)) {
        current[Number(catIndex)] = current[Number(catIndex)].filter(i => i.id !== itemId);
      }
      return { ...prev, [questionIndex]: current };
    });

    setAvailableItems(prev => {
      const current = [...(prev[questionIndex] || [])];
      const item = findItemObj(questionIndex, itemId);
      if (item && !current.some(i => i.id === itemId)) {
        return { ...prev, [questionIndex]: [...current, item] };
      }
      return prev;
    });

    // Update answers
    const categoriesArray = (question.categories || []).map((_, idx) =>
      (categorizedItems[questionIndex]?.[idx] || []).map(it => it.originalId || it.id)
    );

    setAnswers(prev => ({
      ...prev,
      [questionIndex]: { categories: categoriesArray }
    }));
  };

  const handleClozeAnswerChange = (questionIndex: number, blankIndex: number, value: string) => {
    setAnswers(prev => {
      const currentAnswer = prev[questionIndex] as ClozeAnswer | undefined;
      const newBlanks = currentAnswer?.blanks ? [...currentAnswer.blanks] : [];
      newBlanks[blankIndex] = value;
      
      return {
        ...prev,
        [questionIndex]: { blanks: newBlanks }
      };
    });
  };

  const handleComprehensionAnswerChange = (questionIndex: number, followUpIndex: number, value: string) => {
    setAnswers(prev => {
      const currentAnswer = prev[questionIndex] as ComprehensionAnswer | undefined;
      const newFollowUpAnswers = currentAnswer?.followUpAnswers ? [...currentAnswer.followUpAnswers] : [];
      newFollowUpAnswers[followUpIndex] = value;
      
      return {
        ...prev,
        [questionIndex]: { followUpAnswers: newFollowUpAnswers }
      };
    });
  };

  const submitForm = async () => {
    if (!form) return;

    const isValid = form.questions.every((question, index) => {
      switch (question.type) {
        case 'categorize':
          return Object.values(categorizedItems[index] || {}).some(arr => arr.length > 0);
        case 'cloze': {
          const answer = answers[index] as ClozeAnswer | undefined;
          return answer?.blanks?.every(blank => blank.trim() !== '');
        }
        case 'comprehension': {
          const answer = answers[index] as ComprehensionAnswer | undefined;
          return answer?.followUpAnswers?.every(ans => ans.trim() !== '');
        }
        default:
          return true;
      }
    });

    if (!isValid) {
      toast.error('Please answer all questions before submitting');
      return;
    }

    setSubmitting(true);

    try {
      const finalAnswers: Record<number, Answer> = {};
      form.questions.forEach((question, index) => {
        if (question.type === 'categorize') {
          // Build structured data with category names and item texts
          const categorizedData: { [categoryName: string]: string[] } = {};
          
          Object.entries(categorizedItems[index] || {}).forEach(([catIdx, items]) => {
            const category = question.categories?.[parseInt(catIdx)];
            if (category) {
              categorizedData[category.name] = items.map(item => item.value);
            }
          });
          
          // Convert to backend-expected format: array of arrays
          const categoriesArray = Object.values(categorizedData);
          
          finalAnswers[index] = { categories: categoriesArray };
        } else {
          finalAnswers[index] = answers[index];
        }
      });

      const response = await axios.post(`/responses/${form.id}`, {
        answers: finalAnswers
      });
      
      setResult(response.data);
      setSubmitted(true);
      toast.success('Form submitted successfully!');
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.response?.data?.error || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
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

  if (!form) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6 text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-3">Form Not Found</h1>
          <p className="text-slate-600 mb-8">The form you're looking for is no longer available or doesn't exist.</p>
          <motion.button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-medium flex items-center justify-center w-full"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Return to Homepage
          </motion.button>
        </div>
      </div>
    );
  }

  if (submitted && result) {
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
                {form.mode === 'test' ? (
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
                {form.mode === 'test' ? 'Test Submitted!' : 'Response Recorded!'}
              </motion.h1>
              
              <motion.p 
                className="text-indigo-200 text-lg max-w-md mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {form.mode === 'test' 
                  ? 'Your answers have been submitted for grading.' 
                  : 'Thank you for completing this survey.'}
              </motion.p>
            </div>

            <div className="p-8">
              {form.mode === 'test' && result.score !== undefined && (
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
                    {result.percentage}%
                  </motion.div>
                  <motion.h2 
                    className="text-2xl font-bold text-slate-800 mb-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    {result.percentage && result.percentage >= 80 ? 'Excellent!' : 
                     result.percentage && result.percentage >= 60 ? 'Good Job!' : 'Keep Practicing!'}
                  </motion.h2>
                  <motion.p 
                    className="text-slate-600"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    You scored {result.score} out of {result.maxScore} points
                  </motion.p>
                </motion.div>
              )}

              {form.mode === 'test' && form.settings.showResults && Array.isArray(result.correctAnswers) && (
                <motion.div 
                  className="mt-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                    <Award className="w-5 h-5 mr-2 text-yellow-500" />
                    <span>Review Your Answers</span>
                  </h3>
                  <div className="space-y-6">
                    {form.questions.map((question, index) => {
                      const correct = result.correctAnswers?.[index];
                      return (
                        <motion.div 
                          key={index} 
                          className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200/50"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 * index }}
                        >
                          <div className="flex items-start mb-4">
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl w-10 h-10 flex items-center justify-center mr-3 flex-shrink-0">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-800">{question.title}</h4>
                              {question.description && (
                                <p className="text-slate-600 text-sm mt-1">{question.description}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="ml-13 space-y-4">
                            {question.type === 'categorize' && (
                              <div className="space-y-3">
                                {question.categories?.map((cat, catIdx) => {
                                  const itemsArr = Array.isArray(correct) && correct[catIdx]
                                    ? correct[catIdx]
                                    : [];
                                    
                                  return (
                                    <div key={catIdx} className="flex">
                                      <div className="font-medium text-slate-700 w-24 flex-shrink-0">
                                        {cat.name}:
                                      </div> 
                                      <div className="flex-1">
                                        {itemsArr.length > 0 
                                          ? itemsArr.map((item: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined, i: React.Key | null | undefined) => (
                                              <span 
                                                key={i} 
                                                className="inline-block bg-gradient-to-r from-green-100 to-emerald-100 text-emerald-800 text-sm px-3 py-1.5 rounded-full mr-2 mb-2"
                                              >
                                                {item}
                                              </span>
                                            ))
                                          : <span className="text-slate-400 italic">None</span>
                                        }
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {question.type === 'cloze' && (
                              <div className="space-y-2">
                                {Array.isArray(correct) && correct.length > 0 ? (
                                  correct.map((blank: string, i: number) => (
                                    <div key={i} className="flex items-center">
                                      <div className="font-medium text-slate-700 w-24 flex-shrink-0">
                                        Blank {i + 1}:
                                      </div>
                                      <div className="bg-gradient-to-r from-green-100 to-emerald-100 text-emerald-800 px-4 py-1.5 rounded-full text-sm">
                                        {blank}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-slate-400 italic">No correct answers provided</div>
                                )}
                              </div>
                            )}

                            {question.type === 'comprehension' && (
                              <div className="space-y-4">
                                {(question.followUpQuestions || []).map((fq, fqIdx) => (
                                  <div key={fqIdx} className="bg-white p-4 rounded-xl border border-slate-200/50">
                                    <div className="font-medium text-slate-800 mb-2">
                                      Q{fqIdx + 1}: {fq.question}
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-emerald-600 font-medium flex items-center">
                                        <ChevronRight className="w-4 h-4 mr-1" />
                                        <span>
                                          {Array.isArray(correct) && correct[fqIdx] 
                                            ? correct[fqIdx] 
                                            : 'No correct answer provided'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              <motion.div 
                className="mt-10 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                <motion.button
                  onClick={() => window.location.href = '/'}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-medium shadow-lg"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Return to Homepage
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
          {form.headerImage && (
            <div className="relative h-56 w-full overflow-hidden">
              <img 
                src={form.headerImage} 
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
                {form.title}
              </motion.h1>
              <div className="flex items-center space-x-2">
                <motion.span 
                  className={`px-4 py-1.5 text-sm font-medium rounded-full shadow-sm ${
                    form.mode === 'test' 
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white' 
                      : 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white'
                  }`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {form.mode === 'test' ? 'Test' : 'Survey'}
                </motion.span>
                {form.settings.timeLimit && (
                  <motion.span 
                    className="px-4 py-1.5 bg-gradient-to-r from-slate-600 to-slate-700 text-white text-sm font-medium rounded-full shadow-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    ⏱️ {form.settings.timeLimit} min
                  </motion.span>
                )}
              </div>
            </div>
            
            {form.description && (
              <motion.p 
                className="text-slate-600 mb-8 text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {form.description}
              </motion.p>
            )}
            
            {form.mode === 'test' && (
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

        {/* Questions */}
        <AnimatePresence>
          {form.questions.map((question, questionIndex) => (
            <motion.div 
              key={question.id} 
              className="bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-xl overflow-hidden mb-8 border border-slate-200/50"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * questionIndex + 0.5 }}
              exit={{ opacity: 0 }}
            >
              <div className="p-6 sm:p-8 border-b border-slate-200/50">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl w-10 h-10 flex items-center justify-center mr-4">
                        {questionIndex + 1}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">
                        {question.title}
                      </h3>
                    </div>
                    {question.description && (
                      <p className="text-slate-600 ml-14 mt-2">{question.description}</p>
                    )}
                  </div>
                  {form.mode === 'test' && (
                    <div className="flex items-center mt-3 sm:mt-0 ml-14 sm:ml-0">
                      <span className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-4 py-1.5 rounded-xl text-sm font-medium">
                        {question.points} {question.points === 1 ? 'point' : 'points'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 sm:p-8">
                {/* Categorize Question */}
                {question.type === 'categorize' && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="space-y-8">
                      <div>
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center text-lg">
                          <List className="w-5 h-5 mr-2 text-blue-500" />
                          <span>Available Items</span>
                        </h4>
                        <DroppableAvailableItems
                          id={`available-${questionIndex}`}
                          items={availableItems[questionIndex] || []}
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
                              id={`category-${questionIndex}-${categoryIndex}`}
                              category={category}
                              items={categorizedItems[questionIndex]?.[categoryIndex] || []}
                              onRemoveItem={(itemId: string) => moveItemToAvailable(questionIndex, itemId)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <DragOverlay dropAnimation={dropAnimation}>
                      {activeItem ? (
                        <DraggableItem 
                          id={activeItem.id} 
                          value={activeItem.value} 
                          isDragging 
                        />
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                )}

                {/* Cloze Question */}
                {question.type === 'cloze' && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-2xl border border-slate-200/50">
                      <h4 className="font-bold text-slate-800 mb-4 flex items-center text-lg">
                        <Type className="w-5 h-5 mr-2 text-blue-500" />
                        <span>Fill in the Blanks</span>
                      </h4>
                      <div className="text-slate-800 leading-relaxed whitespace-pre-wrap text-lg">
                        {question.text?.split(/(_{2,})/g).map((part, partIndex) => {
                          if (part.match(/^_{2,}$/)) {
                            const blankIndex = question.text?.substring(0, partIndex).match(/_{2,}/g)?.length || 0;
                            return (
                              <motion.input
                                key={partIndex}
                                type="text"
                                value={(answers[questionIndex] as ClozeAnswer | undefined)?.blanks?.[blankIndex] || ''}
                                onChange={(e) => handleClozeAnswerChange(questionIndex, blankIndex, e.target.value)}
                                className="inline-block mx-1 px-4 py-2 border-b-2 border-blue-400 bg-white focus:border-blue-600 focus:outline-none min-w-24 text-center shadow-sm rounded-t-xl"
                                placeholder="Answer"
                                whileFocus={{ scale: 1.05 }}
                              />
                            );
                          }
                          return <span key={partIndex}>{part}</span>;
                        })}
                      </div>
                    </div>

                    {(question.blanks || []).length > 0 && (
                      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-2xl border border-blue-200/50">
                        <h5 className="font-bold text-blue-800 mb-3 flex items-center">
                          <FileText className="w-4 h-4 mr-2" />
                          <span>Hints</span>
                        </h5>
                        <div className="space-y-3">
                          {question.blanks?.map((blank, blankIndex) => (
                            <div key={blank.id || blankIndex} className="flex items-center">
                              <span className="font-medium text-blue-700 mr-2">Blank {blankIndex + 1}:</span>
                              <span className="text-blue-600">{blank.hint || 'No hint provided'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Comprehension Question */}
                {question.type === 'comprehension' && (
                  <div className="space-y-8">
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-2xl border border-slate-200/50">
                      <h4 className="font-bold text-slate-800 mb-4 flex items-center text-lg">
                        <BookOpen className="w-5 h-5 mr-2 text-blue-500" />
                        <span>Reading Passage</span>
                      </h4>
                      <div className="text-slate-800 leading-relaxed whitespace-pre-wrap text-lg">
                        {question.passage}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="font-bold text-slate-800 flex items-center text-lg">
                        <FileText className="w-5 h-5 mr-2 text-blue-500" />
                        <span>Questions</span>
                      </h4>
                      {(question.followUpQuestions || []).map((followUp, followUpIndex) => (
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
                            {followUp.options.map((option, optionIndex) => (
                              <motion.label 
                                key={option.id || optionIndex} 
                                className="flex items-center space-x-4 p-4 hover:bg-slate-100/50 rounded-xl cursor-pointer transition-colors border border-slate-200/50"
                                whileHover={{ x: 5 }}
                              >
                                <input
                                  type="radio"
                                  name={`question-${questionIndex}-followup-${followUpIndex}`}
                                  value={option.id}
                                  checked={(answers[questionIndex] as ComprehensionAnswer | undefined)?.followUpAnswers?.[followUpIndex] === option.id}
                                  onChange={(e) => handleComprehensionAnswerChange(questionIndex, followUpIndex, e.target.value)}
                                  className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-slate-800">{option.text}</span>
                              </motion.label>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Submit Button */}
        <motion.div 
          className="mt-10 bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-xl p-6 border border-slate-200/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + (form.questions.length * 0.1) }}
        >
          <motion.button
            onClick={submitForm}
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-lg font-bold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-80 disabled:cursor-not-allowed shadow-xl flex items-center justify-center"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {submitting ? (
              <>
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                <span className="tracking-wide">SUBMITTING...</span>
              </>
            ) : (
              <>
                <span className="tracking-wide">SUBMIT {form.mode === 'test' ? 'TEST' : 'SURVEY'}</span>
                <ChevronRight className="w-5 h-5 ml-3" />
              </>
            )}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default PublicForm;
