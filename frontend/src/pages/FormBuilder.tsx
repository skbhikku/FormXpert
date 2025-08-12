/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
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
  TouchSensor,
  closestCenter
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
  Link,
  Menu,
  Check,
  X,
  Image as ImageIcon,
  HelpCircle,
  Settings,
  LayoutGrid,
  Star,
  User,
  Clock
} from 'lucide-react';

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
  };
}

// Custom hook for drag and drop
const useDragDrop = (initialItems: any[], onUpdate: (items: any[]) => void) => {
  const [items, setItems] = useState(initialItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      onUpdate(newItems);
    }
    setActiveId(null);
  };

  return { 
    items, 
    activeId,
    sensors,
    handleDragStart,
    handleDragEnd,
    setItems
  };
};

const CategoryItem = ({ item, onUpdate, onDelete, categoryColor }: {
  item: any;
  onUpdate: (text: string) => void;
  onDelete: () => void;
  categoryColor?: string;
}) => {
  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 mb-2 shadow-xs transition-all hover:shadow-sm">
      <input
        type="text"
        value={item.text}
        onChange={(e) => onUpdate(e.target.value)}
        className="flex-1 p-2 border-none focus:ring-0 bg-transparent text-gray-700 placeholder-gray-400"
        placeholder="Item text"
      />
      <button
        onClick={onDelete}
        className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
        aria-label="Delete item"
      >
        <Trash2 size={16} />
      </button>
      {categoryColor && (
        <div 
          className="w-4 h-4 rounded-full ml-2 border border-gray-200" 
          style={{ backgroundColor: categoryColor }}
        />
      )}
    </div>
  );
};

const CategorizeEditor = ({ question, onUpdate }: {
  question: Question;
  onUpdate: (updates: Partial<Question>) => void;
}) => {
  const [newItemText, setNewItemText] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');
  const uncategorizedItems = question.items?.filter(item => !item.categoryId) || [];
  
  const colorOptions = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // yellow
    '#8b5cf6', // purple
    '#ec4899', // pink
  ];

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    
    const newItem = {
      id: `item-${Date.now()}`,
      text: newItemText.trim(),
      categoryId: undefined
    };
    
    onUpdate({
      items: [...(question.items || []), newItem]
    });
    setNewItemText('');
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const newCategory = {
      id: `cat-${Date.now()}`,
      name: newCategoryName.trim(),
      color: newCategoryColor
    };
    
    onUpdate({
      categories: [...(question.categories || []), newCategory]
    });
    setNewCategoryName('');
  };

  const handleUpdateItem = (itemId: string, text: string) => {
    const updatedItems = question.items?.map(item => 
      item.id === itemId ? { ...item, text } : item
    );
    onUpdate({ items: updatedItems });
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedItems = question.items?.filter(item => item.id !== itemId);
    onUpdate({ items: updatedItems });
  };

  const handleUpdateCategory = (categoryId: string, name: string, color: string) => {
    const updatedCategories = question.categories?.map(cat => 
      cat.id === categoryId ? { ...cat, name, color } : cat
    );
    onUpdate({ categories: updatedCategories });
  };

  const handleDeleteCategory = (categoryId: string) => {
    // Remove category and unassign items
    const updatedCategories = question.categories?.filter(cat => cat.id !== categoryId);
    const updatedItems = question.items?.map(item => 
      item.categoryId === categoryId ? { ...item, categoryId: undefined } : item
    );
    onUpdate({ categories: updatedCategories, items: updatedItems });
  };

  const handleAssignItem = (itemId: string, categoryId: string) => {
    const updatedItems = question.items?.map(item => 
      item.id === itemId ? { ...item, categoryId } : item
    );
    onUpdate({ items: updatedItems });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 shadow-xs">
          <h3 className="font-medium text-gray-700 mb-3 flex items-center">
            <List className="w-4 h-4 mr-2 text-indigo-500" />
            <span>Items to categorize</span>
            <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs ml-2">
              {uncategorizedItems.length}
            </span>
          </h3>
          
          <div className="mb-4">
            <div className="flex shadow-sm">
              <input
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="Add new item"
              />
              <button
                onClick={handleAddItem}
                className="bg-indigo-600 text-white px-4 py-3 rounded-r-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {uncategorizedItems.length > 0 ? (
              uncategorizedItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-xs transition-all hover:shadow-sm">
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => handleUpdateItem(item.id, e.target.value)}
                    className="flex-1 p-1 border-none focus:ring-0 bg-transparent text-gray-700"
                  />
                  <div className="flex space-x-2">
                    <select
                      value=""
                      onChange={(e) => handleAssignItem(item.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Assign to...</option>
                      {question.categories?.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      aria-label="Delete item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm bg-gray-50 rounded-lg">
                No items to categorize. Add items above.
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 shadow-xs">
          <h3 className="font-medium text-gray-700 mb-3 flex items-center">
            <LayoutGrid className="w-4 h-4 mr-2 text-indigo-500" />
            Categories
          </h3>
          
          <div className="mb-4">
            <div className="flex mb-2 shadow-sm">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="Category name"
              />
              <button
                onClick={handleAddCategory}
                className="bg-indigo-600 text-white px-4 py-3 rounded-r-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            
            <div className="flex items-center space-x-2 pl-1">
              <span className="text-sm text-gray-600">Color:</span>
              <div className="flex space-x-1">
                {colorOptions.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewCategoryColor(color)}
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${newCategoryColor === color ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-110'}`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select ${color} color`}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {question.categories && question.categories.length > 0 ? (
              question.categories.map((category) => {
                const categoryItems = question.items?.filter(item => item.categoryId === category.id) || [];
                return (
                  <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-xs transition-all hover:shadow-sm">
                    <div className="flex items-center justify-between p-3 bg-white border-b border-gray-100">
                      <div className="flex items-center">
                        <div 
                          className="w-4 h-4 rounded-full mr-2 border border-gray-200" 
                          style={{ backgroundColor: category.color }}
                        />
                        <input
                          type="text"
                          value={category.name}
                          onChange={(e) => handleUpdateCategory(category.id, e.target.value, category.color)}
                          className="font-medium bg-transparent border-none focus:ring-0 p-1 text-gray-700"
                        />
                        <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs ml-2">
                          {categoryItems.length}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        aria-label="Delete category"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="p-2 bg-gray-50">
                      {categoryItems.length > 0 ? (
                        categoryItems.map(item => (
                          <CategoryItem
                            key={item.id}
                            item={item}
                            onUpdate={(text) => handleUpdateItem(item.id, text)}
                            onDelete={() => handleDeleteItem(item.id)}
                            categoryColor={category.color}
                          />
                        ))
                      ) : (
                        <div className="text-center py-3 text-gray-500 text-sm bg-white rounded-lg border border-dashed border-gray-300">
                          Drag items here or assign them above
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm bg-gray-50 rounded-lg">
                No categories created yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ClozeEditor = ({ question, onUpdate }: {
  question: Question;
  onUpdate: (updates: Partial<Question>) => void;
}) => {
  const [isEditing, setIsEditing] = useState(true);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const blankRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Initialize blanks if needed
  useEffect(() => {
    if (!question.blanks && question.text) {
      const blankCount = (question.text.match(/___/g) || []).length;
      if (blankCount > 0) {
        const blanks = Array.from({ length: blankCount }, (_, i) => ({
          id: `blank-${i}-${Date.now()}`,
          answer: '',
          hint: ''
        }));
        onUpdate({ blanks });
      }
    }
  }, [question.text, question.blanks, onUpdate]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const blankCount = (text.match(/___/g) || []).length;
    
    // Update blanks if count changed
    let blanks = question.blanks || [];
    if (blankCount > blanks.length) {
      // Add new blanks
      const newBlanks = Array.from({ length: blankCount - blanks.length }, (_, i) => ({
        id: `blank-${blanks.length + i}-${Date.now()}`,
        answer: '',
        hint: ''
      }));
      blanks = [...blanks, ...newBlanks];
    } else if (blankCount < blanks.length) {
      // Remove extra blanks
      blanks = blanks.slice(0, blankCount);
    }
    
    onUpdate({ text, blanks });
  };

  const handleBlankChange = (blankId: string, field: string, value: string) => {
    const updatedBlanks = question.blanks?.map(blank => 
      blank.id === blankId ? { ...blank, [field]: value } : blank
    );
    onUpdate({ blanks: updatedBlanks });
  };

  const handleInsertBlank = () => {
    if (!textRef.current) return;
    
    const textarea = textRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    // Insert blank at cursor position
    const newText = 
      textarea.value.substring(0, start) + 
      '___' + 
      textarea.value.substring(end);
    
    // Create new blank for the inserted blank
    const blankCount = (newText.match(/___/g) || []).length;
    const existingBlankCount = question.blanks?.length || 0;
    
    let blanks = [...(question.blanks || [])];
    if (blankCount > existingBlankCount) {
      blanks.push({
        id: `blank-${Date.now()}`,
        answer: selectedText || '',
        hint: ''
      });
    }
    
    onUpdate({ text: newText, blanks });
    
    // Set cursor after inserted blank
    setTimeout(() => {
      if (textRef.current) {
        textRef.current.selectionStart = start + 3;
        textRef.current.selectionEnd = start + 3;
        textRef.current.focus();
      }
    }, 0);
  };

  const renderPreview = () => {
    if (!question.text) return null;
    
    const parts = question.text.split(/(___)/g);
    let blankIndex = 0;
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs">
        <div className="prose max-w-none text-gray-700">
          {parts.map((part, index) => {
            if (part === '___') {
              const blank = question.blanks?.[blankIndex];
              blankIndex++;
              
              return (
                <span 
                  key={index} 
                  className="relative inline-block mx-1 group"
                >
                  <span className="inline-block w-32 h-8 border-b-2 border-dashed border-indigo-500 align-middle"></span>
                  
                  {blank && (
                    <span className="absolute -top-8 left-0 text-xs px-2 py-1 rounded-md whitespace-nowrap transition-all bg-indigo-100 text-indigo-800">
                      {blank.answer || 'Enter answer'}
                    </span>
                  )}
                </span>
              );
            }
            return <span key={index}>{part}</span>;
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-700 flex items-center">
          <Type className="w-4 h-4 mr-2 text-blue-500" />
          Passage with blanks
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center ${
              isEditing 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isEditing ? 'Preview' : 'Edit'}
          </button>
          <button
            onClick={handleInsertBlank}
            className="flex items-center px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors"
          >
            <Plus size={14} className="mr-1" /> Insert Blank
          </button>
        </div>
      </div>
      
      {isEditing ? (
        <div className="space-y-4">
          <div className="relative">
            <textarea
              ref={textRef}
              value={question.text || ''}
              onChange={handleTextChange}
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[150px] text-gray-700 shadow-sm"
              placeholder="Enter text and use '___' for blanks or click 'Insert Blank'"
            />
            <div className="absolute top-3 right-3 bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded">
              Blanks: {question.blanks?.length || 0}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-3 flex items-center">
              <span>Blank Details</span>
              <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs ml-2">
                {question.blanks?.length || 0}
              </span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {question.blanks && question.blanks.length > 0 ? (
                question.blanks.map((blank, index) => (
                  <div 
                    key={blank.id} 
                    className="p-4 border border-gray-300 rounded-lg bg-white shadow-xs"
                  >
                    <div className="flex items-center mb-2">
                      <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">
                        {index + 1}
                      </span>
                      <h5 className="font-medium text-gray-700">Blank #{index + 1}</h5>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Correct Answer</label>
                        <input
                          ref={(el) => blankRefs.current[blank.id] = el}
                          type="text"
                          value={blank.answer}
                          onChange={(e) => handleBlankChange(blank.id, 'answer', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-transparent shadow-xs"
                          placeholder="Correct answer"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Hint (optional)
                        </label>
                        <input
                          type="text"
                          value={blank.hint || ''}
                          onChange={(e) => handleBlankChange(blank.id, 'hint', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-transparent shadow-xs"
                          placeholder="Hint for the blank"
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-6 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <HelpCircle className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No blanks created yet</h3>
                  <p className="text-gray-600 text-sm">Add blanks to the text above</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        renderPreview()
      )}
    </div>
  );
};

const ComprehensionEditor = ({ question, onUpdate }: {
  question: Question;
  onUpdate: (updates: Partial<Question>) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const handleAddFollowUp = () => {
    const newFollowUp = {
      id: `fq-${Date.now()}`,
      question: '',
      options: [
        { id: `opt-${Date.now()}-1`, text: '' },
        { id: `opt-${Date.now()}-2`, text: '' }
      ],
      correctAnswer: ''
    };
    
    onUpdate({ 
      followUpQuestions: [...(question.followUpQuestions || []), newFollowUp] 
    });
  };

  const handleUpdateFollowUp = (id: string, field: string, value: any) => {
    const updated = (question.followUpQuestions || []).map(fq => 
      fq.id === id ? { ...fq, [field]: value } : fq
    );
    onUpdate({ followUpQuestions: updated });
  };

  const handleDeleteFollowUp = (id: string) => {
    const updated = (question.followUpQuestions || []).filter(fq => fq.id !== id);
    onUpdate({ followUpQuestions: updated });
  };

  const handleAddOption = (followUpId: string) => {
    const updated = (question.followUpQuestions || []).map(fq => {
      if (fq.id === followUpId) {
        return {
          ...fq,
          options: [
            ...fq.options,
            { id: `opt-${Date.now()}`, text: '' }
          ]
        };
      }
      return fq;
    });
    
    onUpdate({ followUpQuestions: updated });
  };

  const handleUpdateOption = (followUpId: string, optionId: string, text: string) => {
    const updated = (question.followUpQuestions || []).map(fq => {
      if (fq.id === followUpId) {
        return {
          ...fq,
          options: fq.options.map(opt => 
            opt.id === optionId ? { ...opt, text } : opt
          )
        };
      }
      return fq;
    });
    
    onUpdate({ followUpQuestions: updated });
  };

  const handleDeleteOption = (followUpId: string, optionId: string) => {
    const updated = (question.followUpQuestions || []).map(fq => {
      if (fq.id === followUpId) {
        const newOptions = fq.options.filter(opt => opt.id !== optionId);
        
        // If correct answer was deleted, clear it
        let correctAnswer = fq.correctAnswer;
        if (correctAnswer === optionId) {
          correctAnswer = '';
        }
        
        return {
          ...fq,
          options: newOptions,
          correctAnswer
        };
      }
      return fq;
    });
    
    onUpdate({ followUpQuestions: updated });
  };

  const handleSetCorrectAnswer = (followUpId: string, optionId: string) => {
    const updated = (question.followUpQuestions || []).map(fq => 
      fq.id === followUpId ? { ...fq, correctAnswer: optionId } : fq
    );
    onUpdate({ followUpQuestions: updated });
  };
    return (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 shadow-xs">
                  <div
                    className="flex items-center justify-between mb-4 cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    <h3 className="font-medium text-gray-700 flex items-center">
                      <BookOpen className="w-4 h-4 mr-2 text-green-500" />
                      Reading Passage
                    </h3>
                    <button
                      className="p-1 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                      }}
                      aria-label={isExpanded ? 'Collapse passage' : 'Expand passage'}
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>

                  {isExpanded && (
                    <textarea
                      value={question.passage || ''}
                      onChange={(e) => onUpdate({ passage: e.target.value })}
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[150px] text-gray-700 shadow-sm"
                      placeholder="Enter the reading passage here..."
                    />
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-700 flex items-center">
                      <span>Follow-up Questions</span>
                      <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-xs ml-2">
                        {question.followUpQuestions?.length || 0}
                      </span>
                    </h3>
                    <button
                      onClick={handleAddFollowUp}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Plus size={16} className="mr-1" /> Add Question
                    </button>
                  </div>

                  <div className="space-y-5">
                    {question.followUpQuestions && question.followUpQuestions.length > 0 ? (
                      question.followUpQuestions.map((followUp, index) => (
                        <div
                          key={followUp.id}
                          className="border rounded-xl transition-all border-gray-200 hover:border-green-300"
                        >
                          <div className="bg-white p-4 border-b border-gray-100">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center flex-1 gap-3">
                                <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                  {index + 1}
                                </span>
                                <textarea
                                  value={followUp.question}
                                  onChange={(e) =>
                                    handleUpdateFollowUp(
                                      followUp.id,
                                      'question',
                                      e.target.value
                                    )
                                  }
                                  className="flex-1 font-medium bg-transparent border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 p-2 h-20 text-gray-700 resize-none"
                                  placeholder="Enter question"
                                />
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFollowUp(followUp.id);
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                aria-label="Delete question"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          <div className="p-4 bg-gray-50 flex flex-col">
                            <div className="space-y-3">
                              {followUp.options.map((option, optIndex) => (
                                <div key={option.id} className="flex items-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSetCorrectAnswer(followUp.id, option.id);
                                    }}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 flex-shrink-0 transition-colors ${
                                      followUp.correctAnswer === option.id
                                        ? 'border-green-500 bg-green-100'
                                        : 'border-gray-300 hover:border-green-300'
                                    }`}
                                    aria-label={
                                      followUp.correctAnswer === option.id
                                        ? 'Correct answer'
                                        : 'Mark as correct'
                                    }
                                  >
                                    {followUp.correctAnswer === option.id && (
                                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    )}
                                  </button>

                                  <input
                                    type="text"
                                    value={option.text}
                                    onChange={(e) =>
                                      handleUpdateOption(
                                        followUp.id,
                                        option.id,
                                        e.target.value
                                      )
                                    }
                                    className="flex-1 p-2.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-transparent shadow-xs text-base"
                                    placeholder={`Option ${optIndex + 1}`}
                                  />

                                  {followUp.options.length > 2 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteOption(followUp.id, option.id);
                                      }}
                                      className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                      aria-label="Delete option"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>

                            <div className="pt-3 mt-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddOption(followUp.id);
                                }}
                                className="flex items-center text-green-600 hover:text-green-800 text-sm font-medium"
                              >
                                <Plus size={14} className="mr-1" /> Add Option
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                        <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                          <HelpCircle className="w-6 h-6 text-gray-400" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 mb-1">
                          No follow-up questions yet
                        </h3>
                        <p className="text-gray-600 text-sm">
                          Add questions to test comprehension of the passage
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )};


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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 250ms ease',
    opacity: isDragging ? 0.5 : 1,
  };

  // Calculate content height for smooth animation
  const contentHeight = isExpanded ? (contentRef.current?.scrollHeight || 0) : 0;

  const handleTypeChange = (newType: Question['type']) => {
    const commonProps = {
      title: question.title,
      description: question.description,
      points: question.points,
      image: question.image
    };
    
    let newQuestion: Partial<Question> = { type: newType };
    
    if (newType === 'categorize') {
      newQuestion = {
        ...newQuestion,
        items: [],
        categories: [{ id: `cat-${Date.now()}`, name: 'Category 1', color: '#3b82f6' }]
      };
    } else if (newType === 'cloze') {
      newQuestion = {
        ...newQuestion,
        text: '',
        blanks: []
      };
    } else if (newType === 'comprehension') {
      newQuestion = {
        ...newQuestion,
        passage: '',
        followUpQuestions: [{
          id: `fq-${Date.now()}`,
          question: '',
          options: [
            { id: `opt-${Date.now()}-1`, text: '' },
            { id: `opt-${Date.now()}-2`, text: '' }
          ],
          correctAnswer: ''
        }]
      };
    }
    
    onUpdate(question.id, { ...commonProps, ...newQuestion });
  };

  const renderQuestionEditor = () => {
    switch (question.type) {
      case 'categorize':
        return (
          <CategorizeEditor
            question={question}
            onUpdate={(updates) => onUpdate(question.id, updates)}
          />
        );

      case 'cloze':
        return (
          <ClozeEditor
            question={question}
            onUpdate={(updates) => onUpdate(question.id, updates)}
          />
        );

      case 'comprehension':
        return (
          <ComprehensionEditor
            question={question}
            onUpdate={(updates) => onUpdate(question.id, updates)}
          />
        );

      default:
        return null;
    }
  };

  // Get icon and color for question type
  const getTypeIcon = () => {
    switch (question.type) {
      case 'categorize': 
        return { icon: <LayoutGrid className="w-4 h-4" />, color: 'bg-purple-100 text-purple-800' };
      case 'cloze': 
        return { icon: <Type className="w-4 h-4" />, color: 'bg-blue-100 text-blue-800' };
      case 'comprehension': 
        return { icon: <BookOpen className="w-4 h-4" />, color: 'bg-green-100 text-green-800' };
      default: 
        return { icon: <HelpCircle className="w-4 h-4" />, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const typeIcon = getTypeIcon();

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 ${
        isDragging ? 'shadow-lg z-10 ring-2 ring-indigo-500' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between p-4 cursor-pointer group" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center space-x-3 flex-1">
          <div 
            {...attributes} 
            {...listeners} 
            className="cursor-grab hover:cursor-grabbing p-1 hover:bg-gray-100 rounded transition-colors" 
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center truncate">
              <span className={`${typeIcon.color} rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2`}>
                {index + 1}
              </span>
              <input
                ref={titleRef}
                type="text"
                value={question.title}
                onChange={(e) => onUpdate(question.id, { title: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-none focus:ring-2 focus:ring-indigo-500 rounded-md p-1 -ml-1 flex-1 min-w-0 text-gray-900 truncate"
                placeholder="Untitled Question"
              />
              <span className={`ml-3 text-xs font-normal px-2 py-1 rounded-full flex items-center ${typeIcon.color}`}>
                {typeIcon.icon}
                <span className="ml-1 capitalize">{question.type}</span>
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={isExpanded ? "Collapse question" : "Expand question"}
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
            aria-label="Delete question"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isExpanded ? '5000px' : '0', // Increased max height
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
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm shadow-xs"
              rows={2}
              placeholder="Question description (optional)"
            />
          </div>

          <div className="mb-4 flex items-center">
            <label className="block text-sm font-medium text-gray-700 mr-3">
              Points
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="100"
                value={question.points}
                onChange={(e) => onUpdate(question.id, { points: parseInt(e.target.value) || 1 })}
                className="w-20 p-2 pl-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-xs"
              />
              <Star className="absolute left-2 top-2.5 w-4 h-4 text-yellow-500" />
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
            <div className="flex flex-wrap gap-2">
              {(['categorize', 'cloze', 'comprehension'] as const).map((type) => {
                const isActive = question.type === type;
                let typeClass = '';
                
                if (type === 'categorize') {
                  typeClass = isActive 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200';
                } else if (type === 'cloze') {
                  typeClass = isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200';
                } else {
                  typeClass = isActive 
                    ? 'bg-green-600 text-white' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200';
                }
                
                return (
                  <button
                    key={type}
                    onClick={() => handleTypeChange(type)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center transition-colors ${typeClass}`}
                  >
                    {type === 'categorize' && <LayoutGrid className="w-4 h-4 mr-1" />}
                    {type === 'cloze' && <Type className="w-4 h-4 mr-1" />}
                    {type === 'comprehension' && <BookOpen className="w-4 h-4 mr-1" />}
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {renderQuestionEditor()}
        </div>
      </div>
    </div>
  );
};

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${checked ? 'peer-checked:bg-indigo-600' : ''}`}></div>
    </label>
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'questions'>('questions');

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
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      }
    })
  );

  useEffect(() => {
    if (id && id !== 'new') {
      fetchForm();
    } else {
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
        newQuestion.categories = [{ id: `cat-${Date.now()}`, name: 'Category 1', color: '#3b82f6' }];
        break;
      case 'cloze':
        newQuestion.text = '';
        newQuestion.blanks = [];
        break;
      case 'comprehension':
        newQuestion.passage = '';
        newQuestion.followUpQuestions = [{
          id: `fq-${Date.now()}`,
          question: '',
          options: [
            { id: `opt-${Date.now()}-1`, text: '' },
            { id: `opt-${Date.now()}-2`, text: '' }
          ],
          correctAnswer: ''
        }];
        break;
    }

    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }));
    
    setNewQuestionIds(prev => [...prev, newQuestion.id]);
    setShowMobileMenu(false);
    setActiveTab('questions');
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

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

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

    setSaving(true);
    try {
      if (id === 'new') {
        const response = await axios.post('/forms', formData);
        toast.success('Form created successfully');
        navigate(`/forms/${response.data.id}/builder`);
      } else {
        await axios.put(`/forms/${id}`, formData);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const activeQuestion = formData.questions.find(q => q.id === activeId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold">
                {id === 'new' ? 'New Form' : 'Edit Form'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-3">
              {id !== 'new' && (
                <button
                  onClick={() => navigate(`/forms/${id}/view`)}
                  className="hidden md:inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-700 bg-white rounded-lg hover:bg-indigo-50 transition-colors shadow-sm"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </button>
              )}
              
              <button
                onClick={saveForm}
                disabled={saving}
                className="fixed bottom-7 right-6 md:static inline-flex items-center px-5 py-2.5 bg-white text-indigo-700 font-bold rounded-lg shadow-lg hover:bg-indigo-50 transition-colors disabled:opacity-50 z-40"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-indigo-700 border-t-transparent rounded-full animate-spin mr-2" />
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
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-4 font-medium text-sm transition-colors flex items-center ${
                activeTab === 'settings' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="w-4 h-4 mr-2" />
              Form Settings
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-6 py-4 font-medium text-sm transition-colors flex items-center ${
                activeTab === 'questions' 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="w-4 h-4 mr-2" />
              Questions
              <span className="bg-indigo-100 text-indigo-800 rounded-full w-5 h-5 flex items-center justify-center text-xs ml-2">
                {formData.questions.length}
              </span>
            </button>
          </div>
        </div>

        {activeTab === 'settings' ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-5 pb-2 border-b border-gray-100">Form Settings</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Form Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-xs"
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-xs"
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-xs"
                rows={3}
                placeholder="Optional description for your form"
              />
            </div>
            
            {/* Header Image Section */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Header Image
              </label>
              
              <div className="flex space-x-4 mb-3">
                <button
                  onClick={() => setImageSource('url')}
                  className={`flex items-center px-4 py-2.5 rounded-lg border transition-colors ${
                    imageSource === 'url' 
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Link className="w-4 h-4 mr-2" />
                  Use URL
                </button>
                
                <button
                  onClick={() => setImageSource('upload')}
                  className={`flex items-center px-4 py-2.5 rounded-lg border transition-colors ${
                    imageSource === 'upload' 
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-xs"
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
                      <div className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors text-center">
                        <div className="flex flex-col items-center justify-center py-6">
                          <Upload className="w-8 h-8 text-gray-500 mb-2" />
                          <span className="text-sm font-medium text-gray-700">
                            Click to upload
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            JPG, PNG, GIF (max 5MB)
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
                    <div className="flex items-center justify-center max-h-60 overflow-hidden rounded-lg">
                      {formData.headerImage ? (
                        <img 
                          src={formData.headerImage} 
                          alt="Header preview" 
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.parentElement!.innerHTML = `
                              <div class="flex flex-col items-center justify-center text-gray-500 p-4 w-full h-48">
                                <ImageIcon class="w-8 h-8 mb-2" />
                                <p class="text-sm">Image failed to load</p>
                              </div>
                            `;
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-48 w-full text-gray-500">
                          <ImageIcon className="w-8 h-8 mb-2" />
                          <p className="text-sm">No image</p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, headerImage: '' }))}
                      className="mt-3 w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Remove Image
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Settings */}
            <div className="mt-8 pt-5 border-t border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Advanced Settings</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-700 flex items-center">
                      <User className="w-4 h-4 mr-2 text-indigo-500" />
                      Allow anonymous responses
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Users can submit without signing in
                    </p>
                  </div>
                  <ToggleSwitch 
                    checked={formData.settings.allowAnonymous} 
                    onChange={(checked) => setFormData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        allowAnonymous: checked
                      }
                    }))} 
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-700 flex items-center">
                      <Eye className="w-4 h-4 mr-2 text-indigo-500" />
                      Show results after submission
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Users can see their results immediately
                    </p>
                  </div>
                  <ToggleSwitch 
                    checked={formData.settings.showResults} 
                    onChange={(checked) => setFormData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        showResults: checked
                      }
                    }))} 
                  />
                </div>
                
                
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            {/* Questions Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Questions</h2>
              
              {/* Desktop Question Buttons */}
              <div className="hidden md:flex items-center space-x-2">
                <button
                  onClick={() => addQuestion('categorize')}
                  className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors shadow-sm"
                >
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Categorize
                </button>
                
                <button
                  onClick={() => addQuestion('cloze')}
                  className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors shadow-sm"
                >
                  <Type className="w-4 h-4 mr-2" />
                  Cloze
                </button>
                
                <button
                  onClick={() => addQuestion('comprehension')}
                  className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors shadow-sm"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Comprehension
                </button>
              </div>
              
              {/* Mobile Question Menu */}
              <div className="md:hidden relative">
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="inline-flex items-center px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Question
                </button>
                
                {showMobileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <button
                      onClick={() => addQuestion('categorize')}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-purple-700 hover:bg-purple-50 flex items-center transition-colors"
                    >
                      <LayoutGrid className="w-4 h-4 mr-2" />
                      Categorize
                    </button>
                    <button
                      onClick={() => addQuestion('cloze')}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50 flex items-center transition-colors"
                    >
                      <Type className="w-4 h-4 mr-2" />
                      Cloze
                    </button>
                    <button
                      onClick={() => addQuestion('comprehension')}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-50 flex items-center transition-colors"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Comprehension
                    </button>
                  </div>
                )}
              </div>
            </div>

            {formData.questions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-indigo-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No questions yet</h3>
                <p className="text-gray-600 mb-4">Add your first question to get started</p>
                <button
                  onClick={() => addQuestion('categorize')}
                  className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-lg shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Question
                </button>
              </div>
            ) : (
              <DndContext 
                sensors={sensors} 
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                collisionDetection={closestCenter}
              >
                <SortableContext 
                  items={formData.questions.map(q => q.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-5">
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
                    <div className="bg-white rounded-xl shadow-lg border border-indigo-300 p-4 opacity-90 transition-all">
                      <div className="flex items-center">
                        <GripVertical className="w-5 h-5 text-indigo-500 mr-2" />
                        <h3 className="font-medium text-gray-900 truncate max-w-xs">
                          {activeQuestion.title || 'Untitled Question'}
                        </h3>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormBuilder;
