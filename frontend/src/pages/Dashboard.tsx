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
  Users,
  X
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
  shareId: string;
}

const Dashboard = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<{ id: string; title: string } | null>(null);

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

  const confirmDelete = (formId: string, title: string) => {
    setFormToDelete({ id: formId, title });
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!formToDelete) return;
    
    try {
      await axios.delete(`/forms/${formToDelete.id}`);
      setForms(forms.filter(form => form.id !== formToDelete.id));
      toast.success('Form deleted successfully');
    } catch (error) {
      toast.error('Failed to delete form');
    } finally {
      setDeleteModalOpen(false);
      setFormToDelete(null);
    }
  };

  const copyShareLink = (shareId: string) => {
    const shareUrl = `${window.location.origin}/forms/${shareId}/public`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-10">
      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Confirm Deletion</h3>
                <button 
                  onClick={() => setDeleteModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <span className="font-semibold">"{formToDelete?.title}"</span>? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex items-center"
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1.5">Form Dashboard</h1>
            <p className="text-gray-600 font-light">Create and manage your forms</p>
          </div>
          <Link
            to="/forms/new/builder"
            className="mt-4 sm:mt-0 inline-flex items-center px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-blue-100"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create New Form
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-xl">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Forms</p>
                <p className="text-2xl font-bold text-gray-900">{forms.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 rounded-xl">
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

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-purple-50 rounded-xl">
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
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No forms created yet</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              Get started by creating a new form to collect responses
            </p>
            <Link
              to="/forms/new/builder"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create First Form
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {forms.map((form) => (
              <div 
                key={form.id} 
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1 mb-4 lg:mb-0">
                    <div className="flex flex-wrap items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">{form.title}</h3>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            form.mode === 'test' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {form.mode === 'test' ? 'Test' : 'Survey'}
                          </span>
                          {form.isActive ? (
                            <span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Active
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {form.description && (
                      <p className="text-gray-600 mb-4 text-sm">{form.description}</p>
                    )}
                    
                    <div className="flex flex-wrap items-center text-sm text-gray-500 gap-4">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1.5 text-gray-400" />
                        <span>Created {format(new Date(form.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1.5 text-gray-400" />
                        <span>{form.responseCount || 0} responses</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/forms/${form.id}/view`}
                      className="inline-flex items-center px-3.5 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Link>

                    <Link
                      to={`/forms/${form.id}/builder`}
                      className="inline-flex items-center px-3.5 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Link>

                    <button
                      onClick={() => copyShareLink(form.shareId)}
                      className="inline-flex items-center px-3.5 py-2 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Share
                    </button>

                    <Link
                      to={`/forms/${form.id}/responses`}
                      className="inline-flex items-center px-3.5 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Results
                    </Link>

                    <button
                      onClick={() => confirmDelete(form.id, form.title)}
                      className="inline-flex items-center px-3.5 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
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
