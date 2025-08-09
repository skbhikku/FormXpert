/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  ExternalLink, 
  BarChart3,
  Calendar,
  Clock,
  Users
} from 'lucide-react';
import { format } from 'date-fns';

interface Form {
  id: string;
  title: string;
  description: string;
  mode: string;
  isActive: number;
  createdAt: string;
  responseCount?: number;
}

const Dashboard = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await axios.get('/forms/my');
      setForms(response.data);
    } catch (error) {
      toast.error('Failed to fetch forms');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (formId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`/forms/${formId}`);
      setForms(forms.filter(form => form.id !== formId));
      toast.success('Form deleted successfully');
    } catch (error) {
      toast.error('Failed to delete form');
    }
  };

  const copyShareLink = (formId: string) => {
    const shareUrl = `${window.location.origin}/forms/${formId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Manage your forms and view responses</p>
      </div>
      <Link
        to="/forms/new/builder"
        className="mt-4 sm:mt-0 inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
      >
        <Plus className="w-5 h-5 mr-2" />
        New Form
      </Link>
    </div>


        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-xl">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Forms</p>
                <p className="text-2xl font-bold text-gray-900">{forms.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-xl">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Responses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {forms.reduce((sum, form) => sum + (form.responseCount || 0), 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Forms</p>
                <p className="text-2xl font-bold text-gray-900">
                  {forms.filter(form => form.isActive).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Forms List */}
        {forms.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No forms yet</h3>
            <p className="text-gray-600 mb-6">Create your first form to get started</p>
            <Link
              to="/forms/new/builder"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Form
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {forms.map((form) => (
              <div key={form.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{form.title}</h3>
                      <div className="flex items-center space-x-2 ml-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          form.mode === 'test' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {form.mode === 'test' ? 'Test' : 'Survey'}
                        </span>
                        {form.isActive ? (
                          <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {form.description && (
                      <p className="text-gray-600 mb-4">{form.description}</p>
                    )}
                    
                    <div className="flex items-center text-sm text-gray-500 space-x-6">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Created {format(new Date(form.createdAt), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {form.responseCount || 0} responses
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 mt-4 lg:mt-0 lg:ml-6">
                    <Link
                      to={`/forms/${form.id}/view`}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Link>

                    <Link
                      to={`/forms/${form.id}/builder`}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Link>

                    <button
                      onClick={() => copyShareLink(form.id)}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Share
                    </button>

                    <Link
                      to={`/forms/${form.id}/responses`}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Responses
                    </Link>

                    <button
                      onClick={() => handleDelete(form.id, form.title)}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;