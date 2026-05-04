import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMagic, FaCheckCircle, FaPalette, FaRulerVertical, FaDollarSign, FaQuestionCircle } from 'react-icons/fa';
import Swal from 'sweetalert2';

const HAIR_TEXTURES = [
  { id: 'straight', label: 'Straight', icon: '🧍', description: 'Smooth and sleek' },
  { id: 'body-wave', label: 'Body Wave', icon: '🌊', description: 'Gentle S-shaped waves' },
  { id: 'deep-curry', label: 'Deep Curly', icon: '🌀', description: 'Tight, bouncy curls' },
  { id: 'kinky', label: 'Kinky/Coily', icon: '🔥', description: 'Z-pattern coils' },
];

const HAIR_COLORS = [
  { id: 'jet-black', label: 'Jet Black', hex: '#0a0a0a', code: '1' },
  { id: 'natural-black', label: 'Natural Black', hex: '#1a1a1a', code: '1B' },
  { id: 'off-black', label: 'Off Black', hex: '#2a2a2a', code: '2' },
  { id: 'dark-brown', label: 'Dark Brown', hex: '#3d2817', code: '4' },
  { id: 'medium-brown', label: 'Medium Brown', hex: '#5c4033', code: '6' },
  { id: 'light-brown', label: 'Light Brown', hex: '#8b6f47', code: '8' },
  { id: 'dark-blonde', label: 'Dark Blonde', hex: '#b89f5c', code: '10' },
  { id: 'medium-blonde', label: 'Medium Blonde', hex: '#d4b76a', code: '12' },
  { id: 'light-blonde', label: 'Light Blonde', hex: '#e8d68a', code: '16' },
  { id: 'platinum', label: 'Platinum', hex: '#f5e6c4', code: '613' },
  { id: 'burgundy', label: 'Burgundy', hex: '#800020', code: '99J' },
  { id: 'cherry-red', label: 'Cherry Red', hex: '#9b111e', code: '33' },
];

const FACE_SHAPES = [
  { id: 'oval', label: 'Oval', description: 'Balanced proportions, most styles work' },
  { id: 'round', label: 'Round', description: 'Soft angles, needs length' },
  { id: 'square', label: 'Square', description: 'Strong jawline, soft layers work well' },
  { id: 'heart', label: 'Heart', description: 'Wider forehead, chin-length styles' },
  { id: 'long', label: 'Long', description: 'Elongated, needs volume on sides' },
];

const BUDGET_RANGES = [
  { id: 'budget', label: 'Budget-Friendly', range: 'KSh 2,000 - 5,000', icon: '💰' },
  { id: 'mid', label: 'Mid-Range', range: 'KSh 5,000 - 15,000', icon: '💰💰' },
  { id: 'premium', label: 'Premium', range: 'KSh 15,000 - 30,000', icon: '💰💰💰' },
  { id: 'luxury', label: 'Luxury', range: 'KSh 30,000+', icon: '💎' },
];

const STEPS = [
  { id: 'texture', title: 'Find Your Texture', icon: FaMagic },
  { id: 'color', title: 'Choose Your Color', icon: FaPalette },
  { id: 'length', title: 'Select Length', icon: FaRulerVertical },
  { id: 'face', title: 'Face Shape', icon: FaQuestionCircle },
  { id: 'budget', title: 'Budget Range', icon: FaDollarSign },
];

function HairQuiz() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({
    texture: null,
    color: null,
    length: null,
    faceShape: null,
    budget: null,
  });
  const [showResults, setShowResults] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  const handleAnswer = (key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }));

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      generateRecommendations({ ...answers, [key]: value });
    }
  };

  const generateRecommendations = (finalAnswers) => {
    // This would normally call an API endpoint
    // For now, we'll generate mock recommendations based on answers
    const mockRecommendations = [
      {
        id: 'rec-1',
        name: 'Premium Body Wave Bundle',
        price: 8500,
        image: '/assets/hair-logo.png',
        matchScore: 95,
        reasons: ['Matches your texture preference', 'Popular for your face shape', 'Within budget'],
      },
      {
        id: 'rec-2',
        name: 'Luxury Deep Curly Set',
        price: 15000,
        image: '/assets/hair-logo.png',
        matchScore: 88,
        reasons: ['Trending in your color', 'Great value'],
      },
      {
        id: 'rec-3',
        name: 'Silky Straight Bundle Pack',
        price: 12000,
        image: '/assets/hair-logo.png',
        matchScore: 82,
        reasons: ['Perfect length match', 'Easy maintenance'],
      },
    ];

    setRecommendations(mockRecommendations);
    setShowResults(true);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleRestart = () => {
    setAnswers({
      texture: null,
      color: null,
      length: null,
      faceShape: null,
      budget: null,
    });
    setCurrentStep(0);
    setShowResults(false);
  };

  const handleShopNow = (product) => {
    navigate(`/product/${product.id}`);
  };

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case 'texture':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {HAIR_TEXTURES.map((texture) => (
              <button
                key={texture.id}
                onClick={() => handleAnswer('texture', texture.id)}
                className={`p-6 rounded-xl border-2 transition-all transform hover:scale-105 ${
                  answers.texture === texture.id
                    ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20'
                    : 'border-brown-200 dark:border-brown-800 hover:border-gold-300'
                }`}
              >
                <div className="text-4xl mb-2">{texture.icon}</div>
                <h3 className="font-semibold text-charcoal dark:text-white">{texture.label}</h3>
                <p className="text-xs text-brown-500 mt-1">{texture.description}</p>
              </button>
            ))}
          </div>
        );

      case 'color':
        return (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {HAIR_COLORS.map((color) => (
              <button
                key={color.id}
                onClick={() => handleAnswer('color', color.id)}
                className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                  answers.color === color.id
                    ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20'
                    : 'border-brown-200 dark:border-brown-800 hover:border-gold-300'
                }`}
              >
                <div
                  className="w-12 h-12 rounded-full border-2 border-white shadow-md mb-2"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-xs font-medium text-charcoal dark:text-white">{color.label}</span>
                <span className="text-xs text-brown-500">#{color.code}</span>
              </button>
            ))}
          </div>
        );

      case 'length':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { id: 'short', label: 'Short (8-12")', icon: '👦', desc: 'Chin to shoulder' },
              { id: 'medium', label: 'Medium (14-18")', icon: '👩', desc: 'Shoulder to mid-back' },
              { id: 'long', label: 'Long (20-24")', icon: '💃', desc: 'Mid to lower back' },
              { id: 'extra-long', label: 'Extra Long (26-30")', icon: '👸', desc: 'Waist length' },
            ].map((length) => (
              <button
                key={length.id}
                onClick={() => handleAnswer('length', length.id)}
                className={`p-6 rounded-xl border-2 transition-all ${
                  answers.length === length.id
                    ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20'
                    : 'border-brown-200 dark:border-brown-800 hover:border-gold-300'
                }`}
              >
                <div className="text-4xl mb-2">{length.icon}</div>
                <h3 className="font-semibold text-charcoal dark:text-white">{length.label}</h3>
                <p className="text-xs text-brown-500 mt-1">{length.desc}</p>
              </button>
            ))}
          </div>
        );

      case 'face':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FACE_SHAPES.map((shape) => (
              <button
                key={shape.id}
                onClick={() => handleAnswer('faceShape', shape.id)}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  answers.faceShape === shape.id
                    ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20'
                    : 'border-brown-200 dark:border-brown-800 hover:border-gold-300'
                }`}
              >
                <h3 className="font-semibold text-charcoal dark:text-white mb-2">{shape.label}</h3>
                <p className="text-sm text-brown-500">{shape.description}</p>
              </button>
            ))}
          </div>
        );

      case 'budget':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BUDGET_RANGES.map((budget) => (
              <button
                key={budget.id}
                onClick={() => handleAnswer('budget', budget.id)}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  answers.budget === budget.id
                    ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20'
                    : 'border-brown-200 dark:border-brown-800 hover:border-gold-300'
                }`}
              >
                <div className="text-3xl mb-2">{budget.icon}</div>
                <h3 className="font-semibold text-charcoal dark:text-white">{budget.label}</h3>
                <p className="text-sm text-gold-600 dark:text-gold-400 mt-1">{budget.range}</p>
              </button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (showResults) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gold-100 dark:bg-gold-900/30 mb-4">
            <FaCheckCircle className="text-4xl text-gold-600" />
          </div>
          <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-2">
            Your Perfect Hair Matches
          </h2>
          <p className="text-brown-500">
            Based on your preferences, we've found {recommendations.length} perfect matches
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {recommendations.map((rec, index) => (
            <div
              key={rec.id}
              className="bg-white dark:bg-dm-card rounded-xl shadow-lg overflow-hidden border border-brown-100 dark:border-dm-border"
            >
              <div className="relative">
                <div className="aspect-square bg-brown-50 dark:bg-dm-surface flex items-center justify-center">
                  <span className="text-6xl">💇‍♀️</span>
                </div>
                <div className="absolute top-3 right-3 bg-gold-500 text-charcoal font-bold px-3 py-1 rounded-full text-sm">
                  {rec.matchScore}% Match
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg text-charcoal dark:text-white mb-2">
                  {rec.name}
                </h3>
                <p className="text-gold-600 dark:text-gold-400 font-bold text-lg mb-3">
                  KSh {rec.price.toLocaleString()}
                </p>
                <div className="space-y-1 mb-4">
                  {rec.reasons.map((reason, i) => (
                    <div key={i} className="flex items-center text-sm text-brown-600 dark:text-brown-300">
                      <FaCheckCircle className="text-green-500 mr-2 text-xs" />
                      {reason}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleShopNow(rec)}
                  className="w-full bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold py-3 rounded-lg transition-colors"
                >
                  Shop Now
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={handleRestart}
            className="text-brown-500 hover:text-gold-600 underline"
          >
            Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex flex-col items-center ${
                index <= currentStep ? 'text-gold-600' : 'text-brown-400'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  index <= currentStep
                    ? 'bg-gold-500 text-charcoal'
                    : 'bg-brown-200 dark:bg-brown-800'
                }`}
              >
                <step.icon className="text-sm" />
              </div>
              <span className="text-xs mt-1 hidden md:block">{step.title}</span>
            </div>
          ))}
        </div>
        <div className="h-2 bg-brown-200 dark:bg-brown-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-charcoal dark:text-white mb-2">
          {STEPS[currentStep].title}
        </h2>
        <p className="text-brown-500">
          Step {currentStep + 1} of {STEPS.length}
        </p>
      </div>

      {/* Answer Options */}
      {renderStep()}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            currentStep === 0
              ? 'text-brown-300 cursor-not-allowed'
              : 'text-brown-500 hover:bg-brown-100 dark:hover:bg-brown-800'
          }`}
        >
          ← Back
        </button>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 text-brown-500 hover:bg-brown-100 dark:hover:bg-brown-800 rounded-lg font-semibold transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

export default HairQuiz;
