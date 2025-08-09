/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Plus, 
  Save, 
  Eye, 
  GripVertical,
  Trash2,
  List,
  BookOpen,
  Type,
  ChevronDown,
  ChevronUp,
  Upload,
  Link
} from 'lucide-react';

interface Question {
  id: string;
  type: 'categorize' | 'cloze' | 'comprehension';
  title: string;
  description?: string;
  image?: string;
  points: number;
  // Categorize specific
  items?: string[];
  categories?: { name: string; items: string[] }[];
  correctAnswer?: unknown;
  // Cloze specific
  text?: string;
  blanks?: number;
  // Comprehension specific
  passage?: string;
  followUpQuestions?: { question: string; options: string[]; correctAnswer: string }[];
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

const SortableQuestion = ({ question, index, onUpdate, onDelete, isNew }: {
  question: Question;
  index: number;
  onUpdate: (questionId: string, updates: Partial<Question>) => void;
  onDelete: (questionId: string) => void;
  isNew: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const [isExpanded, setIsExpanded] = useState(isNew);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [newCategoryIndex, setNewCategoryIndex] = useState<number | null>(null);
  const [newFollowUpIndex, setNewFollowUpIndex] = useState<number | null>(null);
  const [newOptionIndices, setNewOptionIndices] = useState<{ followUpIndex: number; optionIndex: number } | null>(null);

  // Auto-focus title when question is new
  useEffect(() => {
    if (isNew && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [isNew]);

  // Auto-expand when question is added
  useEffect(() => {
    if (isNew) {
      setIsExpanded(true);
    }
  }, [isNew]);

  // Auto-scroll to new category
  useEffect(() => {
    if (newCategoryIndex !== null && contentRef.current) {
      const categoryInputs = contentRef.current.querySelectorAll('.category-input');
      if (categoryInputs.length > newCategoryIndex) {
        const input = categoryInputs[newCategoryIndex] as HTMLInputElement;
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setNewCategoryIndex(null);
      }
    }
  }, [newCategoryIndex]);

  // Auto-scroll to new follow-up
  useEffect(() => {
    if (newFollowUpIndex !== null && contentRef.current) {
      const followUpElements = contentRef.current.querySelectorAll('.follow-up-container');
      if (followUpElements.length > newFollowUpIndex) {
        followUpElements[newFollowUpIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const textarea = followUpElements[newFollowUpIndex].querySelector('textarea') as HTMLTextAreaElement;
        if (textarea) {
          setTimeout(() => textarea.focus(), 300);
        }
        setNewFollowUpIndex(null);
      }
    }
  }, [newFollowUpIndex]);

  // Auto-scroll to new option
  useEffect(() => {
    if (newOptionIndices !== null && contentRef.current) {
      const followUpElements = contentRef.current.querySelectorAll('.follow-up-container');
      if (followUpElements.length > newOptionIndices.followUpIndex) {
        const optionInputs = followUpElements[newOptionIndices.followUpIndex].querySelectorAll('.option-input');
        if (optionInputs.length > newOptionIndices.optionIndex) {
          const input = optionInputs[newOptionIndices.optionIndex] as HTMLInputElement;
          setTimeout(() => {
            input.focus();
            input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 100);
          setNewOptionIndices(null);
        }
      }
    }
  }, [newOptionIndices]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 250ms ease',
    opacity: isDragging ? 0.5 : 1,
  };

  // Calculate content height for smooth animation
  const contentHeight = isExpanded ? (contentRef.current?.scrollHeight || 0) : 0;

  const handleAddCategory = () => {
    const newCategories = [...(question.categories || []), { name: '', items: [] }];
    onUpdate(question.id, { categories: newCategories });
    setNewCategoryIndex(newCategories.length - 1);
  };

  const handleAddFollowUp = () => {
    const newFollowUps = [...(question.followUpQuestions || []), {
      question: '',
      options: ['', ''],
      correctAnswer: ''
    }];
    onUpdate(question.id, { followUpQuestions: newFollowUps });
    setNewFollowUpIndex(newFollowUps.length - 1);
  };

  const handleAddOption = (followUpIndex: number) => {
    const newFollowUps = [...(question.followUpQuestions || [])];
    newFollowUps[followUpIndex] = { 
      ...newFollowUps[followUpIndex], 
      options: [...newFollowUps[followUpIndex].options, '']
    };
    onUpdate(question.id, { followUpQuestions: newFollowUps });
    setNewOptionIndices({ followUpIndex, optionIndex: newFollowUps[followUpIndex].options.length - 1 });
  };

  const renderQuestionEditor = () => {
    switch (question.type) {
      // ... (previous code remains the same)

case 'categorize':
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Items to categorize (one per line)
        </label>
        <textarea
          value={question.items?.join('\n') || ''}
          onChange={(e) => onUpdate(question.id, { items: e.target.value.split('\n') })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
            }
          }}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
          placeholder="Apple&#10;Banana&#10;Car&#10;Truck"
        />    
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Categories
        </label>
        {question.categories?.map((category, categoryIndex) => (
          <div key={categoryIndex} className="mb-3 p-4 bg-gray-50 rounded-lg relative">
            <div className="flex items-center justify-between mb-2">
              <input
                type="text"
                value={category.name}
                onChange={(e) => {
                  const newCategories = [...(question.categories || [])];
                  newCategories[categoryIndex] = { ...category, name: e.target.value };
                  onUpdate(question.id, { categories: newCategories });
                }}
                className="w-full p-2 border border-gray-300 rounded-md category-input"
                placeholder="Category name"
                autoFocus={categoryIndex === newCategoryIndex}
              />
              <button
                onClick={() => {
                  const newCategories = [...(question.categories || [])];
                  newCategories.splice(categoryIndex, 1);
                  onUpdate(question.id, { categories: newCategories });
                }}
                className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-full"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <textarea
              value={category.items?.join('\n') || ''}
              onChange={(e) => {
                const newCategories = [...(question.categories || [])];
                newCategories[categoryIndex] = { 
                  ...category, 
                  items: e.target.value.split('\n')
                };
                onUpdate(question.id, { categories: newCategories });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                }
              }}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              rows={2}
              placeholder="Items that belong in this category (one per line)"
            />
          </div>
        )) || []}
        <button
          onClick={handleAddCategory}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
        >
          <Plus size={14} className="mr-1" /> Add Category
        </button>
      </div>
    </div>
  );



      case 'cloze':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Text with blanks (use ___ for blanks)
              </label>
              <textarea
                value={question.text || ''}
                onChange={(e) => {
                  const text = e.target.value;
                  const blanks = (text.match(/___/g) || []).length;
                  onUpdate(question.id, { text, blanks });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                  }
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="The capital of France is ___ and it is a beautiful ___."
              />
              <p className="text-sm text-gray-500 mt-1">
                Found {question.blanks || 0} blank(s)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correct answers (one per line, in order)
              </label>
             <textarea
  value={
    Array.isArray(question.correctAnswer)
      ? question.correctAnswer.join('\n')
      : ''
  }
  onChange={(e) =>
    onUpdate(question.id, {
      correctAnswer: e.target.value.split('\n')
    })
  }
  rows={question.blanks || 2}
  placeholder={`Paris\ncity`}
  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>

            </div>
          </div>
        );

      case 'comprehension':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reading Passage
              </label>
              <textarea
                value={question.passage || ''}
                onChange={(e) => onUpdate(question.id, { passage: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                  }
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={6}
                placeholder="Enter the reading passage here..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Follow-up Questions
              </label>
              {question.followUpQuestions?.map((followUp, followUpIndex) => (
                <div key={followUpIndex} className="mb-4 p-4 bg-gray-50 rounded-lg follow-up-container">
                  <textarea
                    value={followUp.question}
                    onChange={(e) => {
                      const newFollowUps = [...(question.followUpQuestions || [])];
                      newFollowUps[followUpIndex] = { ...followUp, question: e.target.value };
                      onUpdate(question.id, { followUpQuestions: newFollowUps });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                      }
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md mb-2"
                    placeholder="Follow-up question"
                    rows={2}
                    autoFocus={followUpIndex === newFollowUpIndex}
                  />
                  
                  <div className="space-y-2">
                    {followUp.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name={`question-${question.id}-followup-${followUpIndex}`}
                          checked={followUp.correctAnswer === option}
                          onChange={() => {
                            const newFollowUps = [...(question.followUpQuestions || [])];
                            newFollowUps[followUpIndex] = { ...followUp, correctAnswer: option };
                            onUpdate(question.id, { followUpQuestions: newFollowUps });
                          }}
                          className="w-4 h-4 text-blue-600"
                        />
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newFollowUps = [...(question.followUpQuestions || [])];
                            const newOptions = [...followUp.options];
                            newOptions[optionIndex] = e.target.value;
                            
                            // If the correct answer was this option, update it too
                            let correctAnswer = followUp.correctAnswer;
                            if (followUp.correctAnswer === option) {
                              correctAnswer = e.target.value;
                            }
                            
                            newFollowUps[followUpIndex] = { 
                              ...followUp, 
                              options: newOptions,
                              correctAnswer
                            };
                            onUpdate(question.id, { followUpQuestions: newFollowUps });
                          }}
                          className="flex-1 p-2 border border-gray-300 rounded-md option-input"
                          placeholder="Answer option"
                          autoFocus={
                            newOptionIndices?.followUpIndex === followUpIndex && 
                            newOptionIndices?.optionIndex === optionIndex
                          }
                        />
                        <button
                          onClick={() => {
                            const newFollowUps = [...(question.followUpQuestions || [])];
                            const newOptions = [...followUp.options];
                            newOptions.splice(optionIndex, 1);
                            
                            // If we're removing the correct answer, clear it
                            let correctAnswer = followUp.correctAnswer;
                            if (followUp.correctAnswer === option) {
                              correctAnswer = '';
                            }
                            
                            newFollowUps[followUpIndex] = { 
                              ...followUp, 
                              options: newOptions,
                              correctAnswer
                            };
                            onUpdate(question.id, { followUpQuestions: newFollowUps });
                          }}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddOption(followUpIndex)}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                    >
                      <Plus size={14} className="mr-1" /> Add Option
                    </button>
                  </div>
                </div>
              )) || []}
              
              <button
                onClick={handleAddFollowUp}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
              >
                <Plus size={14} className="mr-1" /> Add Follow-up Question
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 ${
        isDragging ? 'shadow-lg z-10 ring-2 ring-blue-500' : ''
      }`}
    >
      <div className="flex items-start justify-between p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center space-x-3 flex-1">
          <div {...attributes} {...listeners} className="cursor-grab hover:cursor-grabbing p-1" onClick={(e) => e.stopPropagation()}>
            <GripVertical className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="bg-gray-100 text-gray-800 rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">
                {index + 1}
              </span>
              <input
                ref={titleRef}
                type="text"
                value={question.title}
                onChange={(e) => onUpdate(question.id, { title: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-none focus:ring-2 focus:ring-blue-500 rounded-md p-1 -ml-1"
                placeholder="Untitled Question"
              />
              <span className="ml-3 text-xs font-normal bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {question.type}
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(question.id);
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isExpanded ? `${contentHeight}px` : '0',
          opacity: isExpanded ? 1 : 0.7
        }}
      >
        <div className="px-6 pb-6 pt-2 border-t border-gray-100">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={question.description || ''}
              onChange={(e) => onUpdate(question.id, { description: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                }
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              rows={2}
              placeholder="Question description (optional)"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
            <input
              type="number"
              min="1"
              max="100"
              value={question.points}
              onChange={(e) => onUpdate(question.id, { points: parseInt(e.target.value) || 1 })}
              className="w-20 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {renderQuestionEditor()}
        </div>
      </div>
    </div>
  );
};

const FormBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<'url' | 'upload'>('url');
  const [newQuestionIds, setNewQuestionIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    headerImage: '',
    mode: 'survey',
    questions: [],
    settings: {
      allowAnonymous: true,
      showResults: true,
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (id && id !== 'new') {
      fetchForm();
    } else {
      // Initialize with a blank form
      setFormData({
        title: '',
        description: '',
        headerImage: '',
        mode: 'survey',
        questions: [],
        settings: {
          allowAnonymous: true,
          showResults: true,
        },
      });
    }
  }, [id]);

  useEffect(() => {
    // Clear new question IDs after 1 second
    if (newQuestionIds.length > 0) {
      const timer = setTimeout(() => {
        setNewQuestionIds([]);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [newQuestionIds]);

  const fetchForm = async () => {
    if (!id || id === 'new') return;
    
    setLoading(true);
    try {
      const response = await axios.get(`/forms/${id}`);
      setFormData({
        title: response.data.title,
        description: response.data.description || '',
        headerImage: response.data.headerImage || '',
        mode: response.data.mode || 'survey',
        questions: response.data.questions || [],
        settings: response.data.settings || {
          allowAnonymous: true,
          showResults: true,
        },
      });
      
      // Set image source based on existing image
      if (response.data.headerImage) {
        if (response.data.headerImage.startsWith('data:image')) {
          setImageSource('upload');
        } else {
          setImageSource('url');
        }
      }
    } catch (error) {
      toast.error('Failed to load form');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = (type: Question['type']) => {
    const newQuestion: Question = {
      id: `question-${Date.now()}`,
      type,
      title: `Untitled ${type.charAt(0).toUpperCase() + type.slice(1)} Question`,
      points: 1,
    };

    switch (type) {
      case 'categorize':
        newQuestion.items = [];
        newQuestion.categories = [{ name: '', items: [] }];
        break;
      case 'cloze':
        newQuestion.text = '';
        newQuestion.blanks = 0;
        newQuestion.correctAnswer = [];
        break;
      case 'comprehension':
        newQuestion.passage = '';
        newQuestion.followUpQuestions = [{
          question: '',
          options: ['', ''],
          correctAnswer: ''
        }];
        break;
    }

    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }));
    
    // Mark as new for auto-expand and focus
    setNewQuestionIds(prev => [...prev, newQuestion.id]);
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      )
    }));
  };

  const deleteQuestion = (questionId: string) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFormData(prev => {
        const oldIndex = prev.questions.findIndex(q => q.id === active.id);
        const newIndex = prev.questions.findIndex(q => q.id === over.id);

        return {
          ...prev,
          questions: arrayMove(prev.questions, oldIndex, newIndex)
        };
      });
    }

    setActiveId(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    // Validate file type
    if (!file.type.match('image.*')) {
      toast.error('Only image files are allowed');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData(prev => ({
          ...prev,
          headerImage: event.target?.result as string
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const saveForm = async () => {
    if (!formData.title.trim()) {
      toast.error('Form title is required');
      return;
    }

    if (formData.questions.length === 0) {
      toast.error('At least one question is required');
      return;
    }

    // Generate correctAnswer for categorize questions in test mode
    let dataToSave = { ...formData };
    if (formData.mode === 'test') {
      dataToSave = {
        ...formData,
        questions: formData.questions.map(q => {
          if (q.type === 'categorize' && Array.isArray(q.items) && Array.isArray(q.categories)) {
            // For each category, collect the items assigned to it
            const categoriesArray = q.categories.map(cat => Array.isArray(cat.items) ? cat.items : []);
            return {
              ...q,
              correctAnswer: { categories: categoriesArray }
            };
          }
          return q;
        })
      };
    }

    setSaving(true);
    try {
      if (id === 'new') {
        const response = await axios.post('/forms', dataToSave);
        toast.success('Form created successfully');
        navigate(`/forms/${response.data.id}/builder`);
      } else {
        await axios.put(`/forms/${id}`, dataToSave);
        toast.success('Form updated successfully');
      }
    } catch (error) {
      toast.error('Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activeQuestion = formData.questions.find(q => q.id === activeId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                {id === 'new' ? 'New Form' : 'Edit Form'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-3">
              {id !== 'new' && (
                <button
                  onClick={() => navigate(`/forms/${id}/view`)}
                  className="fixed top-20 right-6 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </button>
              )}
              
              <button
                onClick={saveForm}
                disabled={saving}
                className="fixed bottom-7 right-6 inline-flex items-center px-6 py-2 bg-blue-600 text-white font-medium rounded-lg shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50 z-40"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Form Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Form Settings</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Form Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter form title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mode
              </label>
              <select
                value={formData.mode}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  mode: e.target.value as 'survey' | 'test' 
                }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="survey">Survey (No scoring)</option>
                <option value="test">Test (Auto-grading)</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                }
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Optional description for your form"
            />
          </div>
          
          {/* Header Image Section */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Header Image
            </label>
            
            <div className="flex space-x-4 mb-3">
              <button
                onClick={() => setImageSource('url')}
                className={`flex items-center px-4 py-2 rounded-lg border ${
                  imageSource === 'url' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                <Link className="w-4 h-4 mr-2" />
                Use URL
              </button>
              
              <button
                onClick={() => setImageSource('upload')}
                className={`flex items-center px-4 py-2 rounded-lg border ${
                  imageSource === 'upload' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700 cursor-pointer' 
                    : 'border-gray-300 bg-white text-gray-700 cursor-pointer'
                }`}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Image
              </button>
            </div>
            
            {imageSource === 'url' ? (
              <div>
                <input
                  type="text"
                  value={formData.headerImage}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    headerImage: e.target.value 
                  }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter a direct link to your image
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center space-x-3">
                  <label className="flex-1">
                    <div className="w-full p-3 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Upload className="w-6 h-6 text-gray-500 mb-2" />
                        <span className="text-sm font-medium text-gray-700">
                          Click to upload
                        </span>
                        <span className="text-xs text-gray-500">
                          JPG, PNG, GIF (max 5MB) , Recommended Max 1200X300px , Min 800X200px
                        </span>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
            
            {formData.headerImage && (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Preview</p>
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-center max-h-60 overflow-hidden">
                    <div className="w-full h-60 overflow-hidden rounded-xl mb-6">
                    <img 
                      src={formData.headerImage} 
                      alt="Header preview" 
                      className="w-full h-full fit-cover"
                      onError={(e) => {
                        // Fallback if image fails to load
                        e.currentTarget.onerror = null;
                        e.currentTarget.parentElement!.innerHTML = `
                          <div class="flex flex-col items-center justify-center text-gray-500 p-4">
                            <ImageIcon class="w-8 h-8 mb-2" />
                            <p class="text-sm">Image failed to load</p>
                          </div>
                        `;
                      }}
                    />
                    </div>
                  </div>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, headerImage: '' }))}
                    className="mt-3 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Remove Image
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Questions</h2>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => addQuestion('categorize')}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <List className="w-4 h-4 mr-2" />
                Categorize
              </button>
              
              <button
                onClick={() => addQuestion('cloze')}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Type className="w-4 h-4 mr-2" />
                Cloze
              </button>
              
              <button
                onClick={() => addQuestion('comprehension')}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Comprehension
              </button>
            </div>
          </div>

          {formData.questions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No questions yet</h3>
              <p className="text-gray-600 mb-4">Add your first question to get started</p>
            </div>
          ) : (
            <DndContext 
              sensors={sensors} 
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={formData.questions.map(q => q.id)} 
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {formData.questions.map((question, index) => (
                    <SortableQuestion
                      key={question.id}
                      question={question}
                      index={index}
                      onUpdate={updateQuestion}
                      onDelete={deleteQuestion}
                      isNew={newQuestionIds.includes(question.id)}
                    />
                  ))}
                </div>
              </SortableContext>
              
              <DragOverlay>
                {activeQuestion ? (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 opacity-90 transition-all">
                    <div className="flex items-center">
                      <GripVertical className="w-5 h-5 text-gray-400 mr-2" />
                      <h3 className="font-medium text-gray-900">
                        {activeQuestion.title || 'Untitled Question'}
                      </h3>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;