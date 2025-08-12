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
  BarChart3,
  Trash2,
  Loader,
  AlertCircle,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Response {
  id: string;
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
  const [deleting, setDeleting] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<Response | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState<'single' | 'all' | null>(null);
  const [responseToDelete, setResponseToDelete] = useState<string | null>(null);

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

  const openDeleteModal = (type: 'single' | 'all', responseId?: string) => {
    setDeleteType(type);
    if (type === 'single' && responseId) {
      setResponseToDelete(responseId);
    }
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteType(null);
    setResponseToDelete(null);
  };

  const handleDelete = async () => {
    if (!deleteType) return;
    
    try {
      setDeleting(true);
      
      if (deleteType === 'single' && responseToDelete) {
        await axios.delete(`/responses/${responseToDelete}`);
        setResponses(responses.filter(r => r.id !== responseToDelete));
        toast.success('Response deleted successfully');
        
        if (form) {
          setForm({
            ...form,
            responseCount: form.responseCount - 1
          });
        }
        
        if (selectedResponse?.id === responseToDelete) {
          setSelectedResponse(null);
        }
      } 
      else if (deleteType === 'all') {
        await axios.delete(`/responses/form/${id}`);
        setResponses([]);
        toast.success('All responses deleted successfully');
        
        if (form) {
          setForm({
            ...form,
            responseCount: 0
          });
        }
      }
    } catch (error) {
      toast.error('Failed to delete response');
    } finally {
      setDeleting(false);
      closeDeleteModal();
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-3">Form Not Found</h1>
          <p className="text-slate-600 mb-8">The form you're looking for is no longer available or doesn't exist.</p>
          <motion.button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-medium flex items-center justify-center w-full"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Return to Dashboard
          </motion.button>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <motion.button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-4 group"
            whileHover={{ x: -5 }}
          >
            <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Back to Dashboard
          </motion.button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <motion.h1 
                className="text-3xl font-bold text-slate-900 mb-2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                Responses for "{form.title}"
              </motion.h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <div className="flex items-center bg-slate-100 px-3 py-1 rounded-full">
                  <Users className="w-4 h-4 mr-1.5 text-slate-500" />
                  <span>{responses.length} total responses</span>
                </div>
                <div className="flex items-center bg-slate-100 px-3 py-1 rounded-full">
                  <BarChart3 className="w-4 h-4 mr-1.5 text-slate-500" />
                  <span>{form.mode === 'test' ? 'Test Mode' : 'Survey Mode'}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center bg-white rounded-xl border border-slate-200 shadow-sm p-1">
                {(['all', 'today', 'week', 'month'] as const).map((f) => (
                  <motion.button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all capitalize ${
                      filter === f 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {f}
                  </motion.button>
                ))}
              </div>
              
              {responses.length > 0 && (
                <motion.button
                  onClick={exportToCSV}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </motion.button>
              )}
              
              {responses.length > 0 && (
                <motion.button
                  onClick={() => openDeleteModal('all')}
                  disabled={deleting}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white font-medium rounded-xl hover:from-red-600 hover:to-rose-700 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {deleting ? (
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete All
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {responses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl shadow-lg border border-slate-200/50">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No responses yet</h3>
            <p className="text-slate-600 mb-6">Share your form to start collecting responses</p>
            <Link
              to={`/forms/${id}/view`}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md"
            >
              <Eye className="w-4 h-4 mr-2" />
              View & Share Form
            </Link>
          </div>
        ) : (
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div 
                className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-md border border-slate-200/50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-xl shadow-sm">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">Total Responses</p>
                    <p className="text-2xl font-bold text-slate-900">{responses.length}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-md border border-slate-200/50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl shadow-sm">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">This Week</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {responses.filter(r => 
                        new Date(r.submittedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      ).length}
                    </p>
                  </div>
                </div>
              </motion.div>

              {form.mode === 'test' && avgScore !== null && (
                <>
                  <motion.div 
                    className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-md border border-slate-200/50"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    <div className="flex items-center">
                      <div className="p-3 bg-gradient-to-r from-purple-100 to-violet-100 rounded-xl shadow-sm">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-600">Average Score</p>
                        <p className="text-2xl font-bold text-slate-900">{Math.round(avgScore)}%</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div 
                    className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-md border border-slate-200/50"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    <div className="flex items-center">
                      <div className="p-3 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-xl shadow-sm">
                        <BarChart3 className="w-6 h-6 text-amber-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-600">Pass Rate</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {Math.round((responses.filter(r => 
                            r.score && r.maxScore && (r.score / r.maxScore) >= 0.7
                          ).length / responses.length) * 100)}%
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </div>

            {/* Charts */}
            {chartData.length > 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div 
                  className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-md border border-slate-200/50"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Response Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'rgba(255, 255, 255, 0.9)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.5rem'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        name="Responses"
                        dot={{ r: 4, fill: '#3B82F6' }}
                        activeDot={{ r: 6, fill: '#2563eb' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>

                {form.mode === 'test' && scoreDistribution.length > 0 && (
                  <motion.div 
                    className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-2xl shadow-md border border-slate-200/50"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Score Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={scoreDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="range" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'rgba(255, 255, 255, 0.9)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid #e2e8f0',
                            borderRadius: '0.5rem'
                          }} 
                        />
                        <Bar 
                          dataKey="count" 
                          fill="#8B5CF6" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}
              </div>
            )}

            {/* Responses Table */}
            <motion.div 
              className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-md border border-slate-200/50 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <div className="p-6 border-b border-slate-200/50">
                <h3 className="text-lg font-semibold text-slate-900">Individual Responses</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Submitted
                      </th>
                      {form.mode === 'test' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Score
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50">
                    {filteredResponses.map((response) => (
                      <motion.tr 
                        key={response.id} 
                        className="hover:bg-slate-50/50"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          #{response.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {format(new Date(response.submittedAt), 'MMM d, yyyy HH:mm')}
                        </td>
                        {form.mode === 'test' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {response.score && response.maxScore ? (
                              <div className="flex items-center">
                                <span className="font-medium">
                                  {Math.round((response.score / response.maxScore) * 100)}%
                                </span>
                                <span className="ml-2 text-xs text-slate-400">
                                  ({response.score}/{response.maxScore})
                                </span>
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {response.ipAddress}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 flex space-x-3">
                          <motion.button
                            onClick={() => setSelectedResponse(response)}
                            className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </motion.button>
                          <motion.button
                            onClick={() => openDeleteModal('single', response.id)}
                            className="text-red-600 hover:text-red-700 font-medium flex items-center"
                            disabled={deleting}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Response Detail Modal */}
        <AnimatePresence>
          {selectedResponse && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div 
                className="bg-gradient-to-br from-white to-slate-50 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200/50"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <div className="p-6 border-b border-slate-200/50 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-sm">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Response #{selectedResponse.id}
                    </h3>
                    <p className="text-sm text-slate-500">
                      Submitted on {format(new Date(selectedResponse.submittedAt), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <motion.button
                      onClick={() => openDeleteModal('single', selectedResponse.id)}
                      disabled={deleting}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white font-medium rounded-lg hover:from-red-600 hover:to-rose-700 transition-all shadow-md mr-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {deleting ? (
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Delete
                    </motion.button>
                    <button
                      onClick={() => setSelectedResponse(null)}
                      className="text-slate-400 hover:text-slate-600 text-xl p-1 rounded-full hover:bg-slate-100"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {form.questions.map((question, index) => {
                    const answer = selectedResponse.answers[index];
                    return (
                      <motion.div 
                        key={index} 
                        className="border-b border-slate-200/50 pb-5 last:border-b-0"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <h4 className="font-medium text-slate-900 mb-3 flex items-center">
                          <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 text-xs">
                            {index + 1}
                          </span>
                          {question.title}
                        </h4>
                        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/50">
                          {answer ? (
                            <>
                              {question.type === 'categorize' && answer.categories && (
                                <div className="space-y-3">
                                  {question.categories.map((category: any, catIndex: number) => (
                                    <div key={catIndex} className="flex items-start">
                                      <div className="font-medium text-sm text-slate-700 min-w-[120px] flex items-center">
                                        <span className="bg-slate-200/50 px-2 py-1 rounded-lg mr-2">
                                          {category.name}:
                                        </span>
                                      </div>
                                      <div className="flex-1 flex flex-wrap gap-2">
                                        {answer.categories[catIndex]?.map((item: string, itemIndex: number) => (
                                          <span 
                                            key={itemIndex} 
                                            className="bg-gradient-to-r from-blue-100 to-cyan-100 text-slate-800 px-3 py-1.5 rounded-lg text-sm"
                                          >
                                            {item}
                                          </span>
                                        ))}
                                        {(!answer.categories[catIndex] || answer.categories[catIndex].length === 0) && (
                                          <span className="text-slate-400 italic text-sm">No items</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {question.type === 'cloze' && answer.blanks && (
                                <div className="space-y-3">
                                  {answer.blanks.map((blank: string, blankIndex: number) => (
                                    <div key={blankIndex} className="flex items-center">
                                      <span className="font-medium text-sm text-slate-700 min-w-[100px]">
                                        Blank {blankIndex + 1}:
                                      </span>
                                      <span className="bg-gradient-to-r from-green-100 to-emerald-100 text-slate-800 px-3 py-1.5 rounded-lg text-sm">
                                        {blank || '(empty)'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {question.type === 'comprehension' && answer.followUpAnswers && (
                                <div className="space-y-4">
                                  {answer.followUpAnswers.map((followUpAnswer: string, followUpIndex: number) => (
                                    <div key={followUpIndex} className="bg-white p-4 rounded-xl border border-slate-200/50">
                                      <div className="font-medium text-slate-800 mb-2 flex items-center">
                                        <span className="bg-slate-200/50 px-2 py-0.5 rounded mr-2 text-xs">
                                          Q{followUpIndex + 1}
                                        </span>
                                        {question.followUpQuestions[followUpIndex]?.question}
                                      </div>
                                      <div className="ml-5 mt-2">
                                        <span className="text-slate-600 bg-slate-100/50 px-3 py-1.5 rounded-lg text-sm">
                                          {followUpAnswer || '(no answer)'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-slate-500 italic">No answer provided</p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div 
                className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200/50"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                    <AlertCircle className="h-10 w-10 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Confirm Deletion
                  </h3>
                  <p className="text-slate-600 mb-6">
                    {deleteType === 'all' 
                      ? 'Are you sure you want to delete ALL responses? This action cannot be undone.' 
                      : 'Are you sure you want to delete this response? This action cannot be undone.'}
                  </p>
                  
                  <div className="flex justify-center space-x-4">
                    <motion.button
                      onClick={closeDeleteModal}
                      className="px-5 py-2.5 text-slate-700 hover:bg-slate-100 rounded-xl font-medium transition-all border border-slate-300"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-rose-700 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {deleting ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FormResponses;
