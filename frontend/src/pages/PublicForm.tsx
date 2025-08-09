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
  KeyboardSensor,
  closestCenter,
} from '@dnd-kit/core';
import {
  
  sortableKeyboardCoordinates,
  useSortable,
  
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CheckCircle, Clock, Trophy, BookOpen, GripVertical } from 'lucide-react';

interface Question {
  id: string;
  type: 'categorize' | 'cloze' | 'comprehension';
  title: string;
  description?: string;
  image?: string;
  points: number;
  items?: string[];
  categories?: { name: string; items: string[] }[];
  correctAnswer?: unknown;
  text?: string;
  blanks?: number;
  passage?: string;
  followUpQuestions?: { question: string; options: string[]; correctAnswer: string }[];
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

interface DraggableItemProps {
  id: string;
  item: string;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ id, item }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-blue-50 border border-blue-200 rounded-lg p-3 cursor-grab hover:cursor-grabbing hover:bg-blue-100 transition-colors select-none"
    >
      <div className="flex items-center">
        <GripVertical className="w-4 h-4 text-gray-400 mr-2" />
        {item}
      </div>
    </div>
  );
};

interface DroppableAvailableItemsProps {
  questionIndex: number;
  items: string[];
}

const DroppableAvailableItems: React.FC<DroppableAvailableItemsProps> = ({ questionIndex, items }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `available-${questionIndex}` });
  return (
    <div
      ref={setNodeRef}
      id={`available-${questionIndex}`}
      className={`grid grid-cols-2 md:grid-cols-3 gap-3 min-h-16 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 ${isOver ? 'border-blue-500 bg-blue-50' : ''}`}
    >
      {items.map(item => (
        <DraggableItem key={`${questionIndex}-${item}`} id={`${questionIndex}-${item}`} item={item} />
      ))}
      {items.length === 0 && (
        <p className="text-gray-500 text-sm italic col-span-full text-center py-4">
          All items have been categorized
        </p>
      )}
    </div>
  );
};

interface DroppableCategoryProps {
  questionIndex: number;
  categoryIndex: number;
  category: { name: string };
  items: string[];
}

const DroppableCategory: React.FC<DroppableCategoryProps> = ({ questionIndex, categoryIndex, category, items }) => {
  const droppableId = `category-${questionIndex}-${categoryIndex}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  
  return (
    <div
      ref={setNodeRef}
      id={droppableId}
      className={`bg-gray-50 border-2 border-dashed rounded-lg p-4 min-h-24 ${isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
    >
      <h5 className="font-medium text-gray-900 mb-3">{category.name}</h5>
      <div className="space-y-2">
        {items.map(item => (
          <DraggableItem key={`${questionIndex}-${item}`} id={`${questionIndex}-${item}`} item={item} />
        ))}
        {items.length === 0 && (
          <p className="text-gray-500 text-sm italic">Drop items here</p>
        )}
      </div>
    </div>
  );
};

const PublicForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  
  type CategorizeAnswer = { categories: string[][] };
  type ClozeAnswer = { blanks: string[] };
  type ComprehensionAnswer = { followUpAnswers: string[] };
  type Answer = CategorizeAnswer | ClozeAnswer | ComprehensionAnswer | undefined;
  
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [availableItems, setAvailableItems] = useState<{ [key: number]: string[] }>({});
  const [categorizedItems, setCategorizedItems] = useState<{ [key: number]: { [categoryIndex: number]: string[] } }>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchForm = useCallback(async () => {
    try {
      const response = await axios.get(`/forms/${id}/public`);
      setForm(response.data);
      
      const initialAnswers: Record<number, Answer> = {};
      const initialAvailable: { [key: number]: string[] } = {};
      const initialCategorized: { [key: number]: { [categoryIndex: number]: string[] } } = {};
      
      response.data.questions.forEach((question: Question, index: number) => {
        if (question.type === 'categorize') {
          initialAvailable[index] = [...(question.items || [])];
          initialCategorized[index] = {};
          question.categories?.forEach((_, catIndex) => {
            initialCategorized[index][catIndex] = [];
          });
          initialAnswers[index] = { categories: [] };
        } else if (question.type === 'cloze') {
          initialAnswers[index] = { blanks: new Array(question.blanks || 0).fill('') };
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

  const handleDragEnd = (event: DragEndEvent, questionIndex: number) => {
    const { active, over } = event;
    if (!over || !form) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Only for categorize questions
    const question = form.questions[questionIndex];
    if (!question || question.type !== 'categorize') return;

    // Extract actual item value from ID
    const itemId = activeId.split('-').slice(1).join('-');

    // Clone current state
    const currentAvailable = [...(availableItems[questionIndex] || [])];
    const currentCategorized = { ...(categorizedItems[questionIndex] || {}) };

    let newAvailable = [...currentAvailable];
    const newCategorized = { ...currentCategorized };

    // Remove item from all locations
    newAvailable = newAvailable.filter(i => i !== itemId);
    Object.keys(newCategorized).forEach(catIdx => {
      const idx = parseInt(catIdx);
      newCategorized[idx] = (newCategorized[idx] || []).filter(i => i !== itemId);
    });

    // Add to new location
    if (overId.startsWith('category-')) {
      const parts = overId.split('-');
      if (parts.length >= 3) {
        const targetQuestionIndex = parseInt(parts[1]);
        const categoryIndex = parseInt(parts[2]);
        
        if (targetQuestionIndex === questionIndex) {
          newCategorized[categoryIndex] = [...(newCategorized[categoryIndex] || []), itemId];
        }
      }
    } else if (overId === `available-${questionIndex}`) {
      newAvailable = [...newAvailable, itemId];
    }

    // Update state
    setAvailableItems(prev => ({ ...prev, [questionIndex]: newAvailable }));
    setCategorizedItems(prev => ({ ...prev, [questionIndex]: newCategorized }));

    // Update answer
    const categoriesArray = question.categories?.map((_, idx) => 
      newCategorized[idx] || []
    ) || [];

    setAnswers(prev => ({
      ...prev,
      [questionIndex]: {
        categories: categoriesArray
      }
    }));
  };

  const submitForm = async () => {
    if (!form) return;

    // Validate answers
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
      // Prepare final answers
      const finalAnswers: Record<number, Answer> = {};
      form.questions.forEach((question, index) => {
        if (question.type === 'categorize') {
          const categoriesArray = question.categories?.map((_, idx) => 
            categorizedItems[index]?.[idx] || []
          ) || [];
          
          finalAnswers[index] = {
            categories: categoriesArray
          };
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
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Failed to submit form');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
          <p className="text-gray-600">This form is no longer available.</p>
        </div>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              {form.mode === 'test' ? (
                <Trophy className="w-8 h-8 text-green-600" />
              ) : (
                <CheckCircle className="w-8 h-8 text-green-600" />
              )}
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {form.mode === 'test' ? 'Test Complete!' : 'Thank You!'}
            </h1>
            
            {form.mode === 'test' && result.score !== undefined && (
              <div className="mb-6">
                <div className="text-6xl font-bold text-blue-600 mb-2">
                  {result.percentage}%
                </div>
                <p className="text-lg text-gray-600">
                  You scored {result.score} out of {result.maxScore} points
                </p>
              </div>
            )}
            
            <p className="text-gray-600 mb-8">
              Your response has been recorded successfully.
            </p>

            {form.mode === 'test' && form.settings.showResults && Array.isArray(result.correctAnswers) && (
              <div className="mt-8 text-left">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Review</h3>
                <div className="space-y-4">
                  {form.questions.map((question, index) => {
                    const correct = result.correctAnswers?.[index];
                    return (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">{question.title}</h4>
                        <div className="text-sm text-gray-600">
                          {question.type === 'categorize' ? (
                            <div>
                              {question.categories?.map((cat, catIdx) => {
                                const itemsArr = Array.isArray(correct) && correct[catIdx]
                                  ? correct[catIdx]
                                  : [];
                                  
                                return (
                                  <div key={catIdx} className="mb-1">
                                    <span className="font-semibold">{cat.name}:</span> 
                                    {itemsArr.length > 0 
                                      ? ` ${itemsArr.join(', ')}` 
                                      : <span className="italic text-gray-400"> No correct items</span>
                                    }
                                  </div>
                                );
                              })}
                            </div>
                          ) : question.type === 'cloze' ? (
                            <div>
                              {Array.isArray(correct) && correct.length > 0 ? (
                                correct.map((blank: string, i: number) => (
                                  <span key={i} className="inline-block mr-2">
                                    Blank {i + 1}: <span className="font-semibold">{blank}</span>
                                  </span>
                                ))
                              ) : (
                                <span className="italic text-gray-400">No correct answers</span>
                              )}
                            </div>
                          ) : question.type === 'comprehension' ? (
                            <div>
                              {(question.followUpQuestions || []).map((fq, fqIdx) => (
                                <div key={fqIdx} className="mb-1">
                                  <span className="font-semibold">Q{fqIdx + 1}:</span> {fq.question}<br />
                                  <span className="ml-4">
                                    Correct Answer: <span className="font-semibold">
                                      {Array.isArray(correct) && correct[fqIdx] 
                                        ? correct[fqIdx] 
                                        : <span className="italic text-gray-400">No correct answer</span>
                                      }
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span>{JSON.stringify(correct)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
       <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
  {form.headerImage && (
    <div className="w-full h-60 overflow-hidden rounded-xl mb-6">
      <img 
        src={form.headerImage} 
        alt="Form header" 
        className="w-full h-full fit-cover"
      />
    </div>
  )}

          
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{form.title}</h1>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                form.mode === 'test' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {form.mode === 'test' ? 'Test' : 'Survey'}
              </span>
            </div>
          </div>
          
          {form.description && (
            <p className="text-gray-600 text-lg leading-relaxed">{form.description}</p>
          )}
          
          {form.mode === 'test' && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                <p className="text-yellow-800 font-medium">
                  This is a test. Your answers will be graded automatically.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-8">
          {form.questions.map((question, questionIndex) => (
            <div key={question.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {questionIndex + 1}. {question.title}
                  </h3>
                  {question.description && (
                    <p className="text-gray-600 mb-4">{question.description}</p>
                  )}
                </div>
                {form.mode === 'test' && (
                  <span className="text-sm text-gray-500">
                    {question.points} {question.points === 1 ? 'point' : 'points'}
                  </span>
                )}
              </div>

              {/* Question Content */}
              {question.type === 'categorize' && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => handleDragEnd(event, questionIndex)}
                >
                  <div className="space-y-6">
                    {/* Available Items */}
                    <DroppableAvailableItems
                      questionIndex={questionIndex}
                      items={availableItems[questionIndex] || []}
                    />

                    {/* Categories */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Categories</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(question.categories || []).map((category, categoryIndex) => (
                          <DroppableCategory
                            key={categoryIndex}
                            questionIndex={questionIndex}
                            categoryIndex={categoryIndex}
                            category={category}
                            items={categorizedItems[questionIndex]?.[categoryIndex] || []}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </DndContext>
              )}

              {question.type === 'cloze' && (
                <div>
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <p className="text-gray-900 text-lg leading-relaxed whitespace-pre-wrap">
                      {question.text?.split('___').map((part, index, array) => (
                        <React.Fragment key={index}>
                          {part}
                          {index < array.length - 1 && (
                            <input
                              type="text"
                              value={(answers[questionIndex] as ClozeAnswer | undefined)?.blanks?.[index] || ''}
                              onChange={(e) => {
                                const newBlanks = [...((answers[questionIndex] as ClozeAnswer | undefined)?.blanks || [])];
                                newBlanks[index] = e.target.value;
                                setAnswers(prev => ({
                                  ...prev,
                                  [questionIndex]: { blanks: newBlanks }
                                }));
                              }}
                              className="mx-2 px-3 py-1 border-b-2 border-blue-300 bg-transparent focus:border-blue-500 focus:outline-none min-w-20"
                              placeholder="..."
                            />
                          )}
                        </React.Fragment>
                      ))}
                    </p>
                  </div>
                </div>
              )}

              {question.type === 'comprehension' && (
                <div>
                  <div className="bg-gray-50 p-6 rounded-lg mb-6">
                    <div className="flex items-center mb-4">
                      <BookOpen className="w-5 h-5 text-gray-600 mr-2" />
                      <h4 className="font-medium text-gray-900">Reading Passage</h4>
                    </div>
                    <div className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                      {question.passage}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="font-medium text-gray-900">Questions</h4>
                    {(question.followUpQuestions || []).map((followUp, followUpIndex) => (
                      <div key={followUpIndex} className="bg-gray-50 p-4 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-3">
                          {followUpIndex + 1}. {followUp.question}
                        </h5>
                        <div className="space-y-2">
                          {followUp.options.map((option, optionIndex) => (
                            <label key={optionIndex} className="flex items-center space-x-3 cursor-pointer">
                              <input
                                type="radio"
                                name={`question-${questionIndex}-followup-${followUpIndex}`}
                                value={option}
                                checked={(answers[questionIndex] as ComprehensionAnswer | undefined)?.followUpAnswers?.[followUpIndex] === option}
                                onChange={(e) => {
                                  const newFollowUpAnswers = [...((answers[questionIndex] as ComprehensionAnswer | undefined)?.followUpAnswers || [])];
                                  newFollowUpAnswers[followUpIndex] = e.target.value;
                                  setAnswers(prev => ({
                                    ...prev,
                                    [questionIndex]: { followUpAnswers: newFollowUpAnswers }
                                  }));
                                }}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-gray-900">{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-12 text-center">
          <button
            onClick={submitForm}
            disabled={submitting}
            className="inline-flex items-center px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                Submitting...
              </>
            ) : (
              `Submit ${form.mode === 'test' ? 'Test' : 'Survey'}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicForm;