/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Edit, 
  ExternalLink, 
  BarChart3, 
  Calendar,
  Users,
  Trophy,
  BookOpen,
  ArrowLeft,
  Clipboard,
  Copy,
  ChevronRight,
  Star,
  FileText,
  Bookmark,
  Plus
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Question {
  id: string;
  type: 'categorize' | 'cloze' | 'comprehension';
  title: string;
  description?: string;
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
  createdAt: string;
  responseCount: number;
  lastResponseAt?: string;
}

const FormView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('questions');

  useEffect(() => {
    if (id) {
      fetchForm();
    }
  }, [id]);

  const fetchForm = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/forms/${id}`);
      setForm(response.data);
    } catch (error) {
      toast.error('Failed to load form');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/forms/${id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Share link copied to clipboard!');
    
    setTimeout(() => setCopied(false), 2000);
  };


  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case 'categorize':
        return 'bg-purple-100 text-purple-800';
      case 'cloze':
        return 'bg-blue-100 text-blue-800';
      case 'comprehension':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderCategorizePreview = (question: Question) => (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-gray-700 mb-2">Items to categorize:</h4>
        <div className="flex flex-wrap gap-2">
          {question.items?.map((item, idx) => (
            <div key={idx} className="px-3 py-1.5 bg-gray-100 rounded-lg text-gray-800">
              {item || `Item ${idx + 1}`}
            </div>
          )) || (
            <div className="text-gray-400 italic">No items defined</div>
          )}
        </div>
      </div>
      
      <div>
        <h4 className="font-medium text-gray-700 mb-2">Categories:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {question.categories?.map((category, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
              <h5 className="font-medium text-gray-900 mb-1">{category.name || `Category ${idx + 1}`}</h5>
              <div className="flex flex-wrap gap-1">
                {category.items?.map((item, itemIdx) => (
                  <span key={itemIdx} className="px-2 py-0.5 bg-gray-50 text-xs rounded text-gray-600">
                    {item}
                  </span>
                ))}
                {(!category.items || category.items.length === 0) && (
                  <span className="text-gray-400 text-xs italic">No items</span>
                )}
              </div>
            </div>
          )) || (
            <div className="text-gray-400 italic">No categories defined</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderClozePreview = (question: Question) => (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-700">Text with blanks:</h4>
      {question.text ? (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          {question.text.split('___').map((part, index) => (
            <React.Fragment key={index}>
              {part}
              {index < (question.blanks || 0) && (
                <span className="inline-block mx-1 w-24 h-6 bg-gray-100 border-b-2 border-dashed border-gray-400 rounded-sm"></span>
              )}
            </React.Fragment>
          ))}
        </div>
      ) : (
        <div className="text-gray-400 italic">No text defined</div>
      )}
      
      <div>
        <h4 className="font-medium text-gray-700 mt-3 mb-1">Answers:</h4>
        <div className="flex flex-wrap gap-2">
          {Array.isArray(question.correctAnswer) && question.correctAnswer.length > 0 ? (
  question.correctAnswer.map((ans, idx) => (
    <div key={idx} className="px-3 py-1 bg-gray-100 rounded-lg text-gray-800 flex items-center">
      <span className="text-xs mr-1 text-gray-500">#{idx + 1}</span>
      {ans}
    </div>
  ))
) : (
  <div className="text-gray-400 italic">No answers defined</div>
)}

        </div>
      </div>
    </div>
  );

  const renderComprehensionPreview = (question: Question) => (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-gray-700 mb-2">Reading Passage:</h4>
        {question.passage ? (
          <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-40 overflow-y-auto">
            <p className="text-gray-700 whitespace-pre-line">{question.passage}</p>
          </div>
        ) : (
          <div className="text-gray-400 italic">No passage defined</div>
        )}
      </div>
      
      <div>
        <h4 className="font-medium text-gray-700 mb-2">Follow-up Questions:</h4>
        <div className="space-y-3">
          {question.followUpQuestions?.map((fq, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center mb-2">
                <span className="text-sm font-medium text-gray-700 mr-2">{idx + 1}.</span>
                <span>{fq.question || `Question ${idx + 1}`}</span>
              </div>
              <div className="space-y-1">
                {fq.options.map((opt, optIdx) => (
                  <div 
                    key={optIdx} 
                    className={`px-3 py-1.5 text-sm rounded ${
                      fq.correctAnswer === opt 
                        ? 'bg-green-50 border border-green-200 text-green-700' 
                        : 'bg-gray-50'
                    }`}
                  >
                    {opt}
                    {fq.correctAnswer === opt && (
                      <span className="ml-2 text-xs text-green-600">✓ Correct</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )) || (
            <div className="text-gray-400 italic">No follow-up questions defined</div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            The form you're looking for doesn't exist or may have been deleted.
          </p>
          <Link 
            to="/dashboard" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const totalPoints = form.questions.reduce((sum, q) => sum + q.points, 0);
  const lastResponse = form.lastResponseAt 
    ? formatDistanceToNow(new Date(form.lastResponseAt), { addSuffix: true })
    : "No responses yet";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            {form.headerImage && (
              <div className="flex justify-center bg-gray-50">
  <div className="w-[70%] h-60 overflow-hidden rounded-xl mb-6 px-10">
    <img 
      src={form.headerImage} 
      alt="Header preview" 
      className="w-full h-full object-cover rounded-[5px]"
      onError={(e) => {
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

            )}
            
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{form.title}</h1>
                    <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${
                      form.mode === 'test' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {form.mode === 'test' ? 'Test Mode' : 'Survey Mode'}
                    </span>
                  </div>
                  
                  {form.description && (
                    <p className="text-gray-600 max-w-3xl mb-4">{form.description}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1.5 text-gray-400" />
                      Created {format(new Date(form.createdAt), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1.5 text-gray-400" />
                      {form.responseCount} response{form.responseCount !== 1 ? 's' : ''}
                    </div>
                    {form.mode === 'test' && (
                      <div className="flex items-center">
                        <Trophy className="w-4 h-4 mr-1.5 text-gray-400" />
                        {totalPoints} total points
                      </div>
                    )}
                    <div className="flex items-center">
                      <Star className="w-4 h-4 mr-1.5 text-gray-400" />
                      Last response: {lastResponse}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
                  <Link
                    to={`/forms/${id}/builder`}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors shadow-sm"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Form
                  </Link>
                  
                  <button
                    onClick={copyShareLink}
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${
                      copied 
                        ? 'bg-green-600 text-white' 
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {copied ? (
                      <Clipboard className="w-4 h-4 mr-2" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    {copied ? 'Copied!' : 'Share Form'}
                  </button>
                  
                  <Link
                    to={`/forms/${id}/responses`}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors shadow-sm"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Responses
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-1 mb-6">
          <div className="flex">
            <button
              onClick={() => setActiveTab('questions')}
              className={`flex-1 py-3 px-4 text-center rounded-xl transition-colors ${
                activeTab === 'questions' 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center">
                <FileText className="w-4 h-4 mr-2" />
                Questions
              </div>
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-3 px-4 text-center rounded-xl transition-colors ${
                activeTab === 'details' 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center">
                <Bookmark className="w-4 h-4 mr-2" />
                Form Details
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'questions' ? (
          /* Questions Preview */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                Questions Preview
              </h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {form.questions.map((question, index) => (
                <div key={question.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-700 font-medium flex-shrink-0">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-1">
                            {question.title}
                          </h3>
                          {question.description && (
                            <p className="text-gray-600 mb-3">{question.description}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getQuestionTypeColor(question.type)}`}>
                            {question.type}
                          </span>
                          {form.mode === 'test' && (
                            <span className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                              {question.points} point{question.points !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        {question.type === 'categorize' && renderCategorizePreview(question)}
                        {question.type === 'cloze' && renderClozePreview(question)}
                        {question.type === 'comprehension' && renderComprehensionPreview(question)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {form.questions.length === 0 && (
                <div className="text-center py-16">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No questions yet</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    This form doesn't have any questions yet. Add questions to start collecting responses.
                  </p>
                  <Link
                    to={`/forms/${id}/builder`}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Questions
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Form Details Tab */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Bookmark className="w-5 h-5 mr-2 text-blue-600" />
                Form Details
              </h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    Creation Details
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex justify-between">
                      <span className="text-gray-600">Created</span>
                      <span className="font-medium">{format(new Date(form.createdAt), 'MMM d, yyyy')}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600">Time since creation</span>
                      <span className="font-medium">
                        {formatDistanceToNow(new Date(form.createdAt))} ago
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600">Question types</span>
                      <div className="flex gap-1">
                        {Array.from(new Set(form.questions.map(q => q.type))).map(type => (
                          <span key={type} className={`px-2 py-0.5 text-xs rounded ${getQuestionTypeColor(type)}`}>
                            {type}
                          </span>
                        ))}
                      </div>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <BarChart3 className="w-4 h-4 mr-2 text-gray-500" />
                    Response Stats
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex justify-between">
                      <span className="text-gray-600">Total responses</span>
                      <span className="font-medium">{form.responseCount}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600">Last response</span>
                      <span className="font-medium">{lastResponse}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600">Questions</span>
                      <span className="font-medium">{form.questions.length}</span>
                    </li>
                    {form.mode === 'test' && (
                      <li className="flex justify-between">
                        <span className="text-gray-600">Total points</span>
                        <span className="font-medium">{totalPoints}</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 bg-blue-50 rounded-xl p-5">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                  <ExternalLink className="w-4 h-4 mr-2 text-blue-500" />
                  Share Options
                </h3>
                <p className="text-gray-700 mb-4">
                  Share this form with respondents using the link below. Responses will be collected in real-time.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 bg-white border border-blue-200 rounded-lg p-3 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <code className="text-sm text-gray-600 truncate">
                        {window.location.origin}/forms/{id}
                      </code>
                      <button
                        onClick={copyShareLink}
                        className="ml-2 p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={copyShareLink}
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <Clipboard className="w-4 h-4 mr-2" />
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to={`/forms/${id}/builder`}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-blue-300 transition-colors group"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mr-3 group-hover:bg-blue-100 transition-colors">
                <Edit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Edit Form</h3>
                <p className="text-sm text-gray-500">Modify questions and settings</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
            </div>
          </Link>
          
          <Link
            to={`/forms/${id}/responses`}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-purple-300 transition-colors group"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mr-3 group-hover:bg-purple-100 transition-colors">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">View Responses</h3>
                <p className="text-sm text-gray-500">Analyze collected data</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
            </div>
          </Link>
          
          <button
            onClick={copyShareLink}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-green-300 transition-colors group text-left"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center mr-3 group-hover:bg-green-100 transition-colors">
                <ExternalLink className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Share Form</h3>
                <p className="text-sm text-gray-500">Get more responses</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormView;