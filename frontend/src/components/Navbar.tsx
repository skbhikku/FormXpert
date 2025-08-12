import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PlusCircle,LogOut, Settings, Menu, X, Home, LayoutDashboard } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const handleNewFormClick = (e: React.MouseEvent) => {
    if (location.pathname === '/forms/new/builder') {
      e.preventDefault();
      setShowModal(true);
    }
    setMobileMenuOpen(false);
  };

  const handleConfirmNewForm = () => {
    setShowModal(false);
    window.location.reload();
  };

  useEffect(() => {
    const handleClickOutside = () => {
      if (mobileMenuOpen) setMobileMenuOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [mobileMenuOpen]);

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md py-2 border-b border-gray-100' : 'bg-white/95 backdrop-blur-sm py-3'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-base">FX</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">FormXpert</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-3">
              {user ? (
                <>
                  <Link
                    to="/"
                    className="flex items-center px-4 py-2 text-gray-600 hover:text-blue-600 rounded-lg transition-all group"
                  >
                    <Home className="w-5 h-5 mr-2 group-hover:text-blue-600" />
                    <span>Home</span>
                  </Link>
                  <Link
                    to="/dashboard"
                    className="flex items-center px-4 py-2 text-gray-600 hover:text-blue-600 rounded-lg transition-all group"
                  >
                    <LayoutDashboard className="w-5 h-5 mr-2 group-hover:text-blue-600" />
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    to="/forms/new/builder"
                    onClick={handleNewFormClick}
                    className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg"
                  >
                    <PlusCircle className="w-5 h-5 mr-2 text-white" />
                    New Form
                  </Link>

                  <div className="relative group ml-2">
                    <button className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-xl transition-all border border-gray-100">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-blue-600 font-medium">
                        {user.firstName.charAt(0)}
                      </div>
                      <span className="text-gray-700 font-medium">{user.firstName}</span>
                    </button>

                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform translate-y-1">
                      <div className="py-2">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{user.email}</div>
                        </div>

                        {user.role === 'admin' && (
                          <Link
                            to="/admin"
                            className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 group transition-all"
                          >
                            <Settings className="w-5 h-5 mr-3 text-gray-400 group-hover:text-blue-500" />
                            <span>Admin Panel</span>
                          </Link>
                        )}

                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-3 text-gray-700 hover:bg-gray-50 group transition-all"
                        >
                          <LogOut className="w-5 h-5 mr-3 text-gray-400 group-hover:text-red-500" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-gray-600 hover:text-blue-600 font-medium rounded-lg transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              {user ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMobileMenuOpen(!mobileMenuOpen);
                  }}
                  className="text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
                </button>
              ) : (
                <div className="flex space-x-2">
                  <Link
                    to="/login"
                    className="px-3 py-2 text-gray-700 text-sm font-medium"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && user && (
          <div className="md:hidden bg-white mt-2 rounded-xl mx-4 shadow-lg border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="py-3 space-y-1">
              <Link
                to="/"
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 group"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home className="w-5 h-5 mr-3 text-gray-500 group-hover:text-blue-500" />
                <span>Home</span>
              </Link>
              <Link
                to="/dashboard"
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 group"
                onClick={() => setMobileMenuOpen(false)}
              >
                <LayoutDashboard className="w-5 h-5 mr-3 text-gray-500 group-hover:text-blue-500" />
                <span>Dashboard</span>
              </Link>
              
              <Link
                to="/forms/new/builder"
                onClick={handleNewFormClick}
                className="flex items-center px-4 py-3 text-blue-600 hover:bg-blue-50 group"
              >
                <PlusCircle className="w-5 h-5 mr-3 text-blue-500" />
                <span>New Form</span>
              </Link>
              
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 group"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Settings className="w-5 h-5 mr-3 text-gray-500 group-hover:text-blue-500" />
                  <span>Admin Panel</span>
                </Link>
              )}
              
              <div className="border-t border-gray-100 pt-2 mt-1">
                <div className="px-4 py-3">
                  <div className="font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{user.email}</div>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-3 text-gray-700 hover:bg-gray-50 group"
                >
                  <LogOut className="w-5 h-5 mr-3 text-gray-500 group-hover:text-red-500" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Spacer */}
      <div className={`h-${mobileMenuOpen ? '80' : '20'}`}></div>

      {/* New Form Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 animate-fade-in">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <PlusCircle className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-center text-gray-800 mb-2">
              Start a New Form?
            </h2>
            <p className="text-gray-600 text-center mb-6">
              You're already editing a form. Starting a new form will reset your current progress.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmNewForm}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-md"
              >
                New Form
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
