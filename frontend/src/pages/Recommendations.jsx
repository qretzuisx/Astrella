import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import GownCard from '../components/GownCard';
import { assets } from '../assets/assets';

const Recommendations = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        
        // Get preferences from URL params
        const bodyType = searchParams.get('bodyType');
        const skinTone = searchParams.get('skinTone');
        const height = searchParams.get('height');
        const eventType = searchParams.get('eventType');
        const faceShape = searchParams.get('faceShape');

        const params = new URLSearchParams();
        if (bodyType) params.append('bodyType', bodyType);
        if (skinTone) params.append('skinTone', skinTone);
        if (height) params.append('height', height);
        if (eventType) params.append('eventType', eventType);
        if (faceShape) params.append('faceShape', faceShape);

        const response = await fetch(`${API_URL}/user/recommendations?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          setRecommendations(data.recommendations || []);
          setPreferences(data.preferences || {});
        } else {
          setError(data.message || 'Failed to fetch recommendations');
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setError('Failed to load recommendations. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [searchParams]);

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-blue-600';
    if (score >= 30) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getScoreBadge = (score) => {
    if (score >= 70) return 'bg-green-100 text-green-800';
    if (score >= 50) return 'bg-blue-100 text-blue-800';
    if (score >= 30) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Finding your perfect apparel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light px-4">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary text-white px-6 py-2 rounded-full hover:bg-primary-dull transition-all"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-primary hover:text-primary-dull mb-4 flex items-center gap-2"
          >
            <span>←</span> Back to Home
          </button>
          <h1 className="text-4xl font-bold mb-2">Your Style Recommendations</h1>
          <p className="text-gray-600">
            We found {recommendations.length} gown{recommendations.length !== 1 ? 's' : ''} that match your preferences
          </p>
        </div>

        {/* Preferences Summary */}
        {(preferences.bodyType || preferences.skinTone || preferences.height || preferences.eventType || preferences.faceShape) && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Your Preferences</h2>
            <div className="flex flex-wrap gap-4">
              {preferences.bodyType && (
                <div className="bg-gray-50 px-4 py-2 rounded-full">
                  <span className="text-sm font-medium text-gray-700">Body Type: </span>
                  <span className="text-sm text-gray-900">{preferences.bodyType}</span>
                </div>
              )}
              {preferences.skinTone && (
                <div className="bg-gray-50 px-4 py-2 rounded-full">
                  <span className="text-sm font-medium text-gray-700">Skin Tone: </span>
                  <span className="text-sm text-gray-900">{preferences.skinTone}</span>
                </div>
              )}
              {preferences.height && (
                <div className="bg-gray-50 px-4 py-2 rounded-full">
                  <span className="text-sm font-medium text-gray-700">Height: </span>
                  <span className="text-sm text-gray-900">{preferences.height}</span>
                </div>
              )}
              {preferences.eventType && (
                <div className="bg-gray-50 px-4 py-2 rounded-full">
                  <span className="text-sm font-medium text-gray-700">Event: </span>
                  <span className="text-sm text-gray-900">{preferences.eventType}</span>
                </div>
              )}
              {preferences.faceShape && (
                <div className="bg-gray-50 px-4 py-2 rounded-full">
                  <span className="text-sm font-medium text-gray-700">Face Shape: </span>
                  <span className="text-sm text-gray-900">{preferences.faceShape}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate('/')}
              className="mt-4 text-primary hover:text-primary-dull text-sm font-medium"
            >
              Change Preferences
            </button>
          </div>
        )}

        {/* Recommendations Grid */}
        {recommendations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((item, index) => (
              <div key={item.gown._id || index} className="relative">
                <div className={`absolute top-2 right-2 z-10 px-3 py-1 rounded-full text-xs font-semibold ${getScoreBadge(item.score)}`}>
                  {item.score}% Match
                </div>
                <GownCard gown={item.gown} />
                {item.matchReason && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {item.matchReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600 mb-4">No apparel found matching your preferences.</p>
            <button
              onClick={() => navigate('/')}
              className="bg-primary text-white px-6 py-2 rounded-full hover:bg-primary-dull transition-all"
            >
              Try Different Preferences
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;

