/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Download, 
  Users, 
  Calendar, 
  TrendingUp,
  Eye,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Response {
  id: number;
  answers: { [key: number]: any };
  score?: number;
  maxScore?: number;
  ipAddress: string;
  submittedAt: string;
}

interface FormData {
  id: string;
  title: string;
  mode: 'survey' | 'test';
  questions: any[];
  responseCount: number;
}

const FormResponses = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState<Response | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    if (id) {
      Promise.all([fetchForm(), fetchResponses()]);
    }
  }, [id]);

  const fetchForm = async () => {
    try {
      const response = await axios.get(`/forms/${id}`);
      setForm(response.data);
    } catch (error) {
      toast.error('Failed to load form');
      navigate('/dashboard');
    }
  };

  const fetchResponses = async () => {
    try {
      const response = await axios.get(`/responses/${id}`);
      setResponses(response.data);
    } catch (error) {
      toast.error('Failed to load responses');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!form || responses.length === 0) return;

    const headers = ['ID', 'Submitted At', 'IP Address'];
    
    // Add question headers
    form.questions.forEach((question, index) => {
      headers.push(`Q${index + 1}: ${question.title}`);
    });
    
    if (form.mode === 'test') {
      headers.push('Score', 'Max Score', 'Percentage');
    }

    const csvContent = [
      headers.join(','),
      ...responses.map(response => {
        const row = [
          response.id,
          format(new Date(response.submittedAt), 'yyyy-MM-dd HH:mm:ss'),
          response.ipAddress
        ];

        // Add answers
        form.questions.forEach((question, index) => {
          const answer = response.answers[index];
          let answerText = '';
          
          if (answer) {
            switch (question.type) {
              case 'categorize':
                answerText = JSON.stringify(answer.categories || []);
                break;
              case 'cloze':
                answerText = (answer.blanks || []).join(' | ');
                break;
              case 'comprehension':
                answerText = (answer.followUpAnswers || []).join(' | ');
                break;
              default:
                answerText = JSON.stringify(answer);
            }
          }
          
          row.push(`"${answerText.replace(/"/g, '""')}"`);
        });

        if (form.mode === 'test') {
          row.push(
            response.score?.toString() || '',
            response.maxScore?.toString() || '',
            response.score && response.maxScore 
              ? Math.round((response.score / response.maxScore) * 100).toString() + '%'
              : ''
          );
        }

        return row.join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${form.title}_responses.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('CSV file downloaded!');
  };

  const getFilteredResponses = () => {
    if (filter === 'all') return responses;
    
    const now = new Date();
    const filterDate = new Date();
    
    switch (filter) {
      case 'today':
        filterDate.setDate(now.getDate());
        break;
      case 'week':
        filterDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        filterDate.setMonth(now.getMonth() - 1);
        break;
    }
    
    return responses.filter(response => 
      new Date(response.submittedAt) >= filterDate
    );
  };

  const getChartData = () => {
    if (responses.length === 0) return [];
    
    const dailyData: { [key: string]: { date: string; count: number; avgScore?: number } } = {};
    
    responses.forEach(response => {
      const date = format(new Date(response.submittedAt), 'MMM dd');
      if (!dailyData[date]) {
        dailyData[date] = { date, count: 0 };
      }
      dailyData[date].count++;
      
      if (form?.mode === 'test' && response.score && response.maxScore) {
        const percentage = (response.score / response.maxScore) * 100;
        dailyData[date].avgScore = (dailyData[date].avgScore || 0) + percentage;
      }
    });
    
    // Calculate average scores
    Object.keys(dailyData).forEach(date => {
      if (dailyData[date].avgScore) {
        dailyData[date].avgScore = Math.round(dailyData[date].avgScore / dailyData[date].count);
      }
    });
    
    return Object.values(dailyData).sort((a, b) => 
      new Date(a.date + ' 2024').getTime() - new Date(b.date + ' 2024').getTime()
    );
  };

  const getScoreDistribution = () => {
    if (form?.mode !== 'test' || responses.length === 0) return [];
    
    const distribution: { [key: string]: number } = {};
    
    responses.forEach(response => {
      if (response.score && response.maxScore) {
        const percentage = Math.round((response.score / response.maxScore) * 100);
        const range = `${Math.floor(percentage / 10) * 10}-${Math.floor(percentage / 10) * 10 + 9}%`;
        distribution[range] = (distribution[range] || 0) + 1;
      }
    });
    
    return Object.entries(distribution).map(([range, count]) => ({
      range,
      count
    })).sort((a, b) => {
      const aStart = parseInt(a.range.split('-')[0]);
      const bStart = parseInt(b.range.split('-')[0]);
      return aStart - bStart;
    });
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
          <Link to="/dashboard" className="text-blue-600 hover:text-blue-700">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const filteredResponses = getFilteredResponses();
  const chartData = getChartData();
  const scoreDistribution = getScoreDistribution();
  
  const avgScore = form.mode === 'test' && responses.length > 0 
    ? responses.reduce((sum, r) => {
        if (r.score && r.maxScore) {
          return sum + (r.score / r.maxScore) * 100;
        }
        return sum;
      }, 0) / responses.filter(r => r.score && r.maxScore).length
    : null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Responses for "{form.title}"
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {responses.length} total responses
                </div>
                <div className="flex items-center">
                  <BarChart3 className="w-4 h-4 mr-1" />
                  {form.mode === 'test' ? 'Test Mode' : 'Survey Mode'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 mt-4 sm:mt-0">
              <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-300 p-1">
                {(['all', 'today', 'week', 'month'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors capitalize ${
                      filter === f 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              
              <button
                onClick={exportToCSV}
                disabled={responses.length === 0}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {responses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-200">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No responses yet</h3>
            <p className="text-gray-600 mb-6">Share your form to start collecting responses</p>
            <Link
              to={`/forms/${id}/view`}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Eye className="w-4 h-4 mr-2" />
              View & Share Form
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Responses</p>
                    <p className="text-2xl font-bold text-gray-900">{responses.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">This Week</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {responses.filter(r => 
                        new Date(r.submittedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      ).length}
                    </p>
                  </div>
                </div>
              </div>

              {form.mode === 'test' && avgScore !== null && (
                <>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-3 bg-purple-100 rounded-xl">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Average Score</p>
                        <p className="text-2xl font-bold text-gray-900">{Math.round(avgScore)}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-3 bg-yellow-100 rounded-xl">
                        <BarChart3 className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Pass Rate</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {Math.round((responses.filter(r => 
                            r.score && r.maxScore && (r.score / r.maxScore) >= 0.7
                          ).length / responses.length) * 100)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Charts */}
            {chartData.length > 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        name="Responses"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {form.mode === 'test' && scoreDistribution.length > 0 && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={scoreDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8B5CF6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* Responses Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Individual Responses</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                      {form.mode === 'test' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Score
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredResponses.map((response) => (
                      <tr key={response.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{response.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(response.submittedAt), 'MMM d, yyyy HH:mm')}
                        </td>
                        {form.mode === 'test' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {response.score && response.maxScore ? (
                              <div className="flex items-center">
                                <span className="font-medium">
                                  {Math.round((response.score / response.maxScore) * 100)}%
                                </span>
                                <span className="ml-2 text-xs text-gray-400">
                                  ({response.score}/{response.maxScore})
                                </span>
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {response.ipAddress}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => setSelectedResponse(response)}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Response Detail Modal */}
        {selectedResponse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-96 overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Response #{selectedResponse.id}
                  </h3>
                  <button
                    onClick={() => setSelectedResponse(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  Submitted on {format(new Date(selectedResponse.submittedAt), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
              
              <div className="p-6 space-y-6">
                {form.questions.map((question, index) => {
                  const answer = selectedResponse.answers[index];
                  return (
                    <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <h4 className="font-medium text-gray-900 mb-2">
                        {index + 1}. {question.title}
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        {answer ? (
                          <>
                            {question.type === 'categorize' && answer.categories && (
                              <div>
                                {question.categories.map((category: any, catIndex: number) => (
                                  <div key={catIndex} className="mb-2">
                                    <span className="font-medium text-sm text-gray-700">
                                      {category.name}:
                                    </span>
                                    <span className="ml-2 text-sm text-gray-600">
                                      {answer.categories[catIndex]?.join(', ') || 'No items'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {question.type === 'cloze' && answer.blanks && (
                              <div className="space-y-1">
                                {answer.blanks.map((blank: string, blankIndex: number) => (
                                  <div key={blankIndex} className="text-sm">
                                    <span className="font-medium text-gray-700">Blank {blankIndex + 1}:</span>
                                    <span className="ml-2 text-gray-600">{blank || '(empty)'}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {question.type === 'comprehension' && answer.followUpAnswers && (
                              <div className="space-y-1">
                                {answer.followUpAnswers.map((followUpAnswer: string, followUpIndex: number) => (
                                  <div key={followUpIndex} className="text-sm">
                                    <span className="font-medium text-gray-700">
                                      Question {followUpIndex + 1}:
                                    </span>
                                    <span className="ml-2 text-gray-600">{followUpAnswer || '(no answer)'}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No answer provided</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormResponses;