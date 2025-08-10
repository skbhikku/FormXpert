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
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CheckCircle, Clock, Trophy, BookOpen, GripVertical, X } from 'lucide-react';

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

interface ItemObj {
  id: string;
  value: string;
}

interface DraggableItemProps {
  id: string;
  value: string;
  // optional remove callback: when provided, an "X" will be shown and clicking it will call onRemove(id)
  onRemove?: (id: string) => void;
}

/**
 * DraggableItem
 * - Uses useSortable for drag behaviour.
 * - Drag listeners/attributes are attached to a dedicated handle to avoid interfering with the remove button click.
 * - The root still uses setNodeRef and sets touchAction: 'none' for mobile reliability.
 */
const DraggableItem: React.FC<DraggableItemProps> = ({ id, value, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none',
    WebkitUserSelect: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-blue-50 border border-blue-200 rounded-lg p-3 hover:bg-blue-100 transition-colors select-none flex items-center"
    >
      {/* Drag handle: attributes & listeners are applied only here so other inner controls (like remove) won't start drag */}
      <button
        type="button"
        aria-label="drag handle"
        {...attributes}
        {...listeners}
        className="mr-3 p-1 rounded-md hover:bg-blue-100 focus:outline-none flex items-center justify-center cursor-grab"
        onClick={(e) => {
          // prevent focusing triggering anything else
          e.stopPropagation();
        }}
      >
        <GripVertical className="w-4 h-4 text-gray-500" />
      </button>

      <div className="text-sm sm:text-base truncate">{value}</div>

      {onRemove && (
        <button
          type="button"
          aria-label="remove item"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRemove(id);
          }}
          className="ml-auto p-1 rounded-full hover:bg-red-50 focus:outline-none"
          title="Remove and move back to available items"
        >
          <X className="w-4 h-4 text-red-500" />
        </button>
      )}
    </div>
  );
};

interface DroppableAvailableItemsProps {
  questionIndex: number;
  items: ItemObj[];
}

const DroppableAvailableItems: React.FC<DroppableAvailableItemsProps> = ({ questionIndex, items }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `available-${questionIndex}` });
  return (
    <div
      ref={setNodeRef}
      id={`available-${questionIndex}`}
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-h-16 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 transition-colors ${
        isOver ? 'border-blue-500 bg-blue-50' : ''
      }`}
    >
      {items.map(item => (
        <DraggableItem key={item.id} id={item.id} value={item.value} />
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
  items: ItemObj[];
  onRemoveItem: (itemId: string) => void;
}

const DroppableCategory: React.FC<DroppableCategoryProps> = ({ questionIndex, categoryIndex, category, items, onRemoveItem }) => {
  const droppableId = `category-${questionIndex}-${categoryIndex}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  
  return (
    <div
      ref={setNodeRef}
      id={droppableId}
      className={`bg-gray-50 border-2 border-dashed rounded-lg p-4 min-h-24 transition-colors ${
        isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
    >
      <h5 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">{category.name}</h5>
      <div className="space-y-2">
        {items.map(item => (
          <DraggableItem key={item.id} id={item.id} value={item.value} onRemove={onRemoveItem} />
        ))}
        {items.length === 0 && (
          <p className="text-gray-500 text-sm italic text-center py-2">Drop items here</p>
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
  const [availableItems, setAvailableItems] = useState<{ [key: number]: ItemObj[] }>({});
  const [categorizedItems, setCategorizedItems] = useState<{ [key: number]: { [categoryIndex: number]: ItemObj[] } }>({});

  // sensors: handle drag from handle; pointer distance can be 0 because handle reduces accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 0,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 8,
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
      const initialAvailable: { [key: number]: ItemObj[] } = {};
      const initialCategorized: { [key: number]: { [categoryIndex: number]: ItemObj[] } } = {};
      
      response.data.questions.forEach((question: Question, index: number) => {
        if (question.type === 'categorize') {
          // create stable ids for each item: q{questionIndex}-i{itemIndex}
          initialAvailable[index] = (question.items || []).map((it, itemIdx) => ({
            id: `q${index}-i${itemIdx}`,
            value: it,
          }));
          initialCategorized[index] = {};
          question.categories?.forEach((_, catIndex) => {
            initialCategorized[index][catIndex] = [];
          });
          initialAnswers[index] = { categories: [] };
        } else if (question.type === 'cloze') {
          // Count blank sequences (2+ underscores) instead of using question.blanks
          const blankCount = (question.text?.match(/_{2,}/g) || []).length;
          initialAnswers[index] = { blanks: new Array(blankCount).fill('') };
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

  // helper to find item by id inside our structured state
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
    // fallback: parse id pattern q{q}-i{idx} to original form.questions items
    const m = itemId.match(/^q(\d+)-i(\d+)$/);
    if (m && form) {
      const qIdx = Number(m[1]);
      const iIdx = Number(m[2]);
      const q = form.questions[qIdx];
      if (q && q.items && q.items[iIdx] !== undefined) {
        return { id: itemId, value: q.items[iIdx] };
      }
    }
    return undefined;
  };

  const handleDragEnd = (event: DragEndEvent, questionIndex: number) => {
    const { active, over } = event;
    if (!over || !form) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const question = form.questions[questionIndex];
    if (!question || question.type !== 'categorize') return;

    // Clone current state for this question
    const currentAvailable = [...(availableItems[questionIndex] || [])];
    const currentCategorized = { ...(categorizedItems[questionIndex] || {}) };

    // Deep clone category arrays
    const newCategorized: { [key: number]: ItemObj[] } = {};
    (question.categories || []).forEach((_, catIdx) => {
      newCategorized[catIdx] = [...(currentCategorized[catIdx] || [])];
    });

    // Remove the item from all places first
    let newAvailable = currentAvailable.filter(i => i.id !== activeId);
    Object.keys(newCategorized).forEach(catIdxStr => {
      const idx = Number(catIdxStr);
      newCategorized[idx] = newCategorized[idx].filter(i => i.id !== activeId);
    });

    // Get the actual item object (value + id)
    const itemObj = findItemObj(questionIndex, activeId);
    if (!itemObj) {
      // nothing to do if we couldn't find the item
      return;
    }

    // Add to destination
    if (overId.startsWith('category-')) {
      const parts = overId.split('-'); // ["category", "{questionIndex}", "{categoryIndex}"]
      if (parts.length >= 3) {
        const targetQuestionIndex = parseInt(parts[1], 10);
        const categoryIndex = parseInt(parts[2], 10);
        
        if (targetQuestionIndex === questionIndex) {
          // ensure bucket exists
          newCategorized[categoryIndex] = [...(newCategorized[categoryIndex] || []), itemObj];
        }
      }
    } else if (overId === `available-${questionIndex}`) {
      newAvailable = [...newAvailable, itemObj];
    }

    // Update state
    setAvailableItems(prev => ({ ...prev, [questionIndex]: newAvailable }));
    setCategorizedItems(prev => ({ ...prev, [questionIndex]: newCategorized }));

    // Update answers in readable form (values only)
    const categoriesArray = (question.categories || []).map((_, idx) =>
      (newCategorized[idx] || []).map(it => it.value)
    );

    setAnswers(prev => ({
      ...prev,
      [questionIndex]: {
        categories: categoriesArray
      }
    }));
  };

  // Move an item from any category (for the question) back to available items
  const moveItemToAvailable = (questionIndex: number, itemId: string) => {
    const question = form?.questions[questionIndex];
    if (!question || question.type !== 'categorize') return;

    const currentAvailable = [...(availableItems[questionIndex] || [])];
    const currentCategorized = { ...(categorizedItems[questionIndex] || {}) };

    // Remove from all categories
    const newCategorized: { [key: number]: ItemObj[] } = {};
    (question.categories || []).forEach((_, catIdx) => {
      newCategorized[catIdx] = (currentCategorized[catIdx] || []).filter(i => i.id !== itemId);
    });

    // Find item object (value + id) - use helper that can rebuild object if needed
    const itemObj = findItemObj(questionIndex, itemId);
    if (!itemObj) return;

    // Add back to available if not present
    const existsInAvailable = currentAvailable.some(i => i.id === itemId);
    const newAvailable = existsInAvailable ? currentAvailable : [...currentAvailable, itemObj];

    // Update state
    setAvailableItems(prev => ({ ...prev, [questionIndex]: newAvailable }));
    setCategorizedItems(prev => ({ ...prev, [questionIndex]: newCategorized }));

    // Update answers (values only)
    const categoriesArray = (question.categories || []).map((_, idx) =>
      (newCategorized[idx] || []).map(it => it.value)
    );

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
          const categoriesArray = (question.categories || []).map((_, idx) =>
            (categorizedItems[index]?.[idx] || []).map(it => it.value)
          );
          
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
          <p className="text-gray-600">This form is no longer available.</p>
        </div>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 sm:py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              {form.mode === 'test' ? (
                <Trophy className="w-8 h-8 text-green-600" />
              ) : (
                <CheckCircle className="w-8 h-8 text-green-600" />
              )}
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              {form.mode === 'test' ? 'Test Complete!' : 'Thank You!'}
            </h1>
            
            {form.mode === 'test' && result.score !== undefined && (
              <div className="mb-6">
                <div className="text-4xl sm:text-6xl font-bold text-blue-600 mb-2">
                  {result.percentage}% 
                </div>
                <p className="text-base sm:text-lg text-gray-600">
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
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {form.questions.map((question, index) => {
                    const correct = result.correctAnswers?.[index];
                    return (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">{question.title}</h4>
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
                            <div className="space-y-1">
                              {Array.isArray(correct) && correct.length > 0 ? (
                                correct.map((blank: string, i: number) => (
                                  <div key={i} className="text-sm">
                                    <span className="font-semibold">Blank {i + 1}:</span>
                                    <span className="ml-2">{blank}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="italic text-gray-400">No correct answers</span>
                              )}
                            </div>
                          ) : question.type === 'comprehension' ? (
                            <div className="space-y-2">
                              {(question.followUpQuestions || []).map((fq, fqIdx) => (
                                <div key={fqIdx} className="text-sm">
                                  <div className="font-semibold mb-1">Q{fqIdx + 1}: {fq.question}</div>
                                  <div className="ml-4">
                                    <span className="text-green-600 font-medium">
                                      Correct Answer: {Array.isArray(correct) && correct[fqIdx] 
                                        ? correct[fqIdx] 
                                        : <span className="italic text-gray-400">No correct answer</span>
                                      }
                                    </span>
                                  </div>
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
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-6 sm:mb-8">
          {form.headerImage && (
            <div className="w-full h-48 sm:h-60 overflow-hidden rounded-xl mb-6">
              <img 
                src={form.headerImage} 
                alt="Form header" 
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-0">{form.title}</h1>
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
            <p className="text-gray-600 text-base sm:text-lg leading-relaxed">{form.description}</p>
          )}
          
          {form.mode === 'test' && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" />
                <p className="text-yellow-800 font-medium text-sm sm:text-base">
                  This is a test. Your answers will be graded automatically.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-6 sm:space-y-8">
          {form.questions.map((question, questionIndex) => (
            <div key={question.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    {questionIndex + 1}. {question.title}
                  </h3>
                  {question.description && (
                    <p className="text-gray-600 mb-4 text-sm sm:text-base">{question.description}</p>
                  )}
                </div>
                {form.mode === 'test' && (
                  <span className="text-sm text-gray-500 mt-2 sm:mt-0">
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
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">Available Items</h4>
                      <DroppableAvailableItems
                        questionIndex={questionIndex}
                        items={availableItems[questionIndex] || []}
                      />
                    </div>

                    {/* Categories */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">Categories</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(question.categories || []).map((category, categoryIndex) => (
                          <DroppableCategory
                            key={categoryIndex}
                            questionIndex={questionIndex}
                            categoryIndex={categoryIndex}
                            category={category}
                            items={categorizedItems[questionIndex]?.[categoryIndex] || []}
                            onRemoveItem={(itemId: string) => moveItemToAvailable(questionIndex, itemId)}
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
                    <p className="text-gray-900 text-base sm:text-lg leading-relaxed whitespace-pre-wrap">
                      {(() => {
                        const parts = question.text?.split(/(_{2,})/g) || [];
                        let blankIndex = 0;
                        
                        return parts.map((part, partIndex) => {
                          // Check if this part is a blank sequence (2+ underscores)
                          if (part.match(/^_{2,}$/)) {
                            const currentBlankIndex = blankIndex;
                            blankIndex++;
                            
                            return (
                              <input
                                key={partIndex}
                                type="text"
                                value={(answers[questionIndex] as ClozeAnswer | undefined)?.blanks?.[currentBlankIndex] || ''}
                                onChange={(e) => {
                                  const newBlanks = [...((answers[questionIndex] as ClozeAnswer | undefined)?.blanks || [])];
                                  newBlanks[currentBlankIndex] = e.target.value;
                                  setAnswers(prev => ({
                                    ...prev,
                                    [questionIndex]: { blanks: newBlanks }
                                  }));
                                }}
                                className="mx-1 sm:mx-2 px-2 sm:px-3 py-1 border-b-2 border-blue-300 bg-transparent focus:border-blue-500 focus:outline-none min-w-16 sm:min-w-20 text-center"
                                placeholder="..."
                              />
                            );
                          }
                          return <span key={partIndex}>{part}</span>;
                        });
                      })()}
                    </p>
                  </div>
                </div>
              )}

              {question.type === 'comprehension' && (
                <div>
                  <div className="bg-gray-50 p-4 sm:p-6 rounded-lg mb-6">
                    <div className="flex items-center mb-4">
                      <BookOpen className="w-5 h-5 text-gray-600 mr-2" />
                      <h4 className="font-medium text-gray-900 text-sm sm:text-base">Reading Passage</h4>
                    </div>
                    <div className="text-gray-900 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                      {question.passage}
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    <h4 className="font-medium text-gray-900 text-sm sm:text-base">Questions</h4>
                    {(question.followUpQuestions || []).map((followUp, followUpIndex) => (
                      <div key={followUpIndex} className="bg-gray-50 p-4 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">
                          {followUpIndex + 1}. {followUp.question}
                        </h5>
                        <div className="space-y-2">
                          {followUp.options.map((option, optionIndex) => (
                            <label key={optionIndex} className="flex items-start space-x-3 cursor-pointer p-2 hover:bg-gray-100 rounded transition-colors">
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
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 mt-0.5 flex-shrink-0"
                              />
                              <span className="text-gray-900 text-sm sm:text-base">{option}</span>
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
        <div className="mt-8 sm:mt-12 text-center">
          <button
            onClick={submitForm}
            disabled={submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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
