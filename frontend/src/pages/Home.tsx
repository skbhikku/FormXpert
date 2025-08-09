import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowRight, 
  CheckCircle, 
  Users, 
  BarChart3, 
  Shield,
  Zap,
  Target,
  Puzzle
} from 'lucide-react';

const Home = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: <Puzzle className="w-8 h-8" />,
      title: 'Unique Question Types',
      description: 'Categorize, Cloze, and Comprehension questions not found in other form builders'
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: 'Auto-Grading',
      description: 'Test mode with instant scoring and detailed feedback for educational assessments'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Secure & Private',
      description: 'Self-hosted solution with robust authentication and data protection'
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: 'Advanced Analytics',
      description: 'Comprehensive response tracking and data export capabilities'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Public Sharing',
      description: 'Share forms with unique URLs - no login required for respondents'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Lightning Fast',
      description: 'Modern React frontend with optimized performance and smooth interactions'
    }
  ];

  const useCases = [
    'Educational institutions creating auto-graded quizzes and exams',
    'HR departments conducting comprehensive employee surveys',
    'Researchers gathering data with complex question formats',
    'Training organizations building certification assessments'
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Build Advanced Forms with
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Unique Question Types</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Create sophisticated forms with Categorize, Cloze, and Comprehension questions. 
              Perfect for tests, quizzes, and surveys with auto-grading capabilities.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
                  >
                    Start Building Forms
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-xl border-2 border-blue-600 hover:bg-blue-50 transform hover:scale-105 transition-all duration-200"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Our Form Builder?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Advanced features designed for educators, researchers, and businesses
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-8 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors duration-200 group"
              >
                <div className="text-blue-600 mb-4 group-hover:scale-110 transition-transform duration-200">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Perfect for Modern Assessment Needs
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Our form builder goes beyond traditional surveys with specialized question types 
                that support complex educational and research requirements.
              </p>
              
              <div className="space-y-4">
                {useCases.map((useCase, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">{useCase}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-xl">
              <div className="space-y-6">
                <div className="bg-blue-50 p-6 rounded-xl">
                  <h4 className="font-semibold text-blue-900 mb-2">Categorize Questions</h4>
                  <p className="text-blue-700 text-sm">Drag and drop items into correct categories</p>
                </div>
                
                <div className="bg-purple-50 p-6 rounded-xl">
                  <h4 className="font-semibold text-purple-900 mb-2">Cloze Questions</h4>
                  <p className="text-purple-700 text-sm">Fill-in-the-blank with text or image support</p>
                </div>
                
                <div className="bg-green-50 p-6 rounded-xl">
                  <h4 className="font-semibold text-green-900 mb-2">Comprehension</h4>
                  <p className="text-green-700 text-sm">Reading passages with follow-up questions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Create Advanced Forms?
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Join educators and researchers who are already using our platform to create 
            sophisticated assessments and surveys.
          </p>
          
          {!user && (
            <Link
              to="/register"
              className="inline-flex items-center px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-xl hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;