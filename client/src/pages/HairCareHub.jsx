import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaBook,
  FaVideo,
  FaQuestionCircle,
  FaFire,
  FaTint,
  FaWind,
  FaShoppingCart,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
} from 'react-icons/fa';

const CARE_GUIDES = [
  {
    id: 'washing',
    title: 'How to Wash Your Extensions',
    icon: FaTint,
    duration: '5 min read',
    difficulty: 'Easy',
    thumbnail: '💧',
    content: {
      steps: [
        {
          title: 'Pre-Wash Preparation',
          description: 'Gently detangle your hair extensions using a wide-tooth comb, starting from the ends and working your way up to the roots.',
          tip: 'Never brush wet hair extensions as they are more prone to breakage.',
        },
        {
          title: 'Shampoo Application',
          description: 'Use sulfate-free shampoo diluted with water. Apply in downward motions only - never scrub or twist the hair.',
          tip: 'Focus on the roots where product buildup occurs. Let the suds run through the lengths.',
        },
        {
          title: 'Conditioning',
          description: 'Apply a moisturizing conditioner from mid-length to ends. Avoid the roots/bonds to prevent slippage.',
          tip: 'Leave conditioner on for 3-5 minutes for deep hydration.',
        },
        {
          title: 'Rinsing & Drying',
          description: 'Rinse with cool water to seal the cuticles. Gently squeeze out excess water with a microfiber towel.',
          tip: 'Never rub or wring the hair. Air dry when possible or use low heat settings.',
        },
      ],
      products: [
        { name: 'Sulfate-Free Shampoo', price: 1200, image: '🧴' },
        { name: 'Moisturizing Conditioner', price: 1500, image: '🧴' },
        { name: 'Wide-Tooth Comb', price: 500, image: '🪮' },
      ],
    },
  },
  {
    id: 'installation',
    title: 'Installation Methods Guide',
    icon: FaFire,
    duration: '10 min read',
    difficulty: 'Intermediate',
    thumbnail: '🔥',
    content: {
      steps: [
        {
          title: 'Clip-In Extensions',
          description: 'Section your natural hair horizontally. Start from the nape and work upwards. Clip the wefts close to the scalp but not on it.',
          tip: 'Use 4-6 clips for a full head. Space them evenly for natural distribution.',
        },
        {
          title: 'Tape-In Extensions',
          description: 'Clean the application area with alcohol. Remove tape backing and sandwich your natural hair between two tape wefts.',
          tip: 'Leave 1mm gap from the scalp. Press firmly for 5 seconds to secure.',
        },
        {
          title: 'Sew-In/Weave',
          description: 'Braid your natural hair into cornrows. Sew the wefts onto the braids using a curved needle and strong thread.',
          tip: 'Double-stitch for security. Keep tension even to prevent discomfort.',
        },
      ],
      products: [
        { name: 'Extension Clips (8-pack)', price: 800, image: '📎' },
        { name: 'Tape Tabs (20-pack)', price: 600, image: '🏷️' },
        { name: 'Curved Needle Set', price: 400, image: '🪡' },
      ],
    },
  },
  {
    id: 'styling',
    title: 'Heat Styling Best Practices',
    icon: FaFire,
    duration: '7 min read',
    difficulty: 'Easy',
    thumbnail: '🔥',
    content: {
      steps: [
        {
          title: 'Heat Protection',
          description: 'Always apply a heat protectant spray before using any hot tools. This creates a barrier against heat damage.',
          tip: 'Reapply after washing. Look for protectants rated up to 450°F.',
        },
        {
          title: 'Temperature Settings',
          description: 'Use 300-350°F for most human hair extensions. Fine hair needs lower heat (250-300°F).',
          tip: 'Start low and increase only if needed. High heat shortens extension lifespan.',
        },
        {
          title: 'Styling Techniques',
          description: 'Use ceramic or tourmaline tools. Work in small sections. Never hold heat in one spot for more than 5 seconds.',
          tip: 'Let hair cool before brushing to set the style.',
        },
      ],
      products: [
        { name: 'Heat Protectant Spray', price: 1800, image: '🧴' },
        { name: 'Ceramic Flat Iron', price: 4500, image: '🔌' },
        { name: 'Curling Wand Set', price: 3800, image: '🌀' },
      ],
    },
  },
  {
    id: 'maintenance',
    title: 'Daily Maintenance Routine',
    icon: FaWind,
    duration: '4 min read',
    difficulty: 'Easy',
    thumbnail: '🌟',
    content: {
      steps: [
        {
          title: 'Morning Routine',
          description: 'Gently detangle with fingers first, then use a soft-bristle brush. Tie in a loose ponytail or braid for the day.',
          tip: 'Use a silk scrunchie to prevent breakage and tangling.',
        },
        {
          title: 'Night Care',
          description: 'Brush thoroughly before bed. Braid or tie in a low ponytail. Sleep on a silk pillowcase.',
          tip: 'Consider a silk bonnet or scarf for extra protection.',
        },
        {
          title: 'Weekly Deep Care',
          description: 'Deep condition once a week. Clarify monthly to remove product buildup. Trim ends every 6-8 weeks.',
          tip: 'Use a hair mask with keratin or argan oil for restoration.',
        },
      ],
      products: [
        { name: 'Silk Pillowcase', price: 2200, image: '🛏️' },
        { name: 'Deep Conditioning Mask', price: 2800, image: '🥣' },
        { name: 'Boar Bristle Brush', price: 1500, image: '🪮' },
      ],
    },
  },
];

const FAQS = [
  {
    question: 'How long do Nawiri Hair extensions last?',
    answer: 'With proper care, our premium human hair extensions can last 6-12 months. Clip-ins typically last longer (1-2 years) since they experience less daily wear. The key is following our care guidelines and using quality products.',
  },
  {
    question: 'Can I dye or bleach the hair extensions?',
    answer: 'Yes! Our 100% Remy human hair can be colored. However, we recommend having a professional stylist do it. Bleaching can weaken the hair, so we suggest going only 1-2 shades lighter than the original color.',
  },
  {
    question: 'How many bundles do I need for a full head?',
    answer: 'For most styles, 3 bundles are recommended for a full, voluminous look. If you want extra length (24"+) or have thick natural hair, consider 4 bundles. For a natural, subtle look, 2 bundles may suffice.',
  },
  {
    question: 'Do the extensions tangle or shed?',
    answer: 'Our double-wefted, cuticle-aligned hair is designed to minimize tangling and shedding. Some initial shedding is normal. To prevent tangling, wash regularly, moisturize daily, and never sleep with wet hair.',
  },
  {
    question: 'Can I swim or exercise with extensions?',
    answer: 'Yes, but take precautions. Braid or tie hair up before swimming. Rinse immediately after exposure to chlorine or saltwater. For workouts, keep hair tied back and wash afterward to remove sweat buildup.',
  },
  {
    question: 'What is the difference between Remy and Virgin hair?',
    answer: 'Remy hair means the cuticles are intact and aligned in the same direction, preventing tangling. Virgin hair is completely unprocessed (never dyed or chemically treated). All our hair is Remy; some collections are also Virgin.',
  },
];

function HairCareHub() {
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);

  return (
    <div className="min-h-screen bg-ivory dark:bg-dm-surface">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-gold-500 to-gold-300 dark:from-gold-700 dark:to-gold-600 py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur mb-6">
            <FaBook className="text-4xl text-charcoal" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-charcoal mb-4">
            Nawiri Hair Care Hub
          </h1>
          <p className="text-xl text-charcoal/80 max-w-2xl mx-auto">
            Expert guides, tutorials, and tips to keep your extensions looking flawless.
            Because beautiful hair deserves beautiful care.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: FaVideo, label: 'Video Tutorials', color: 'bg-red-100 text-red-600' },
            { icon: FaBook, label: 'Care Guides', color: 'bg-blue-100 text-blue-600' },
            { icon: FaQuestionCircle, label: 'FAQs', color: 'bg-green-100 text-green-600' },
            { icon: FaShoppingCart, label: 'Shop Products', color: 'bg-gold-100 text-gold-600' },
          ].map((link, i) => (
            <button
              key={i}
              className={`p-6 rounded-xl ${link.color} dark:bg-opacity-20 transition-transform hover:scale-105`}
            >
              <link.icon className="text-2xl mx-auto mb-2" />
              <span className="text-sm font-medium">{link.label}</span>
            </button>
          ))}
        </div>

        {/* Care Guides Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-8 text-center">
            Care Guides & Tutorials
          </h2>

          {!selectedGuide ? (
            <div className="grid md:grid-cols-2 gap-6">
              {CARE_GUIDES.map((guide) => (
                <button
                  key={guide.id}
                  onClick={() => setSelectedGuide(guide)}
                  className="text-left bg-white dark:bg-dm-card rounded-xl p-6 shadow-lg border border-brown-100 dark:border-dm-border hover:shadow-xl transition-shadow group"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-5xl">{guide.thumbnail}</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-charcoal dark:text-white mb-2 group-hover:text-gold-600 transition-colors">
                        {guide.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-brown-500">
                        <span className="flex items-center gap-1">
                          <FaVideo /> {guide.duration}
                        </span>
                        <span className="px-2 py-1 bg-brown-100 dark:bg-brown-800 rounded text-xs">
                          {guide.difficulty}
                        </span>
                      </div>
                    </div>
                    <FaChevronDown className="text-brown-400 group-hover:text-gold-500 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-dm-card rounded-xl p-8 shadow-lg border border-brown-100 dark:border-dm-border">
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setSelectedGuide(null)}
                  className="text-brown-500 hover:text-gold-600 flex items-center gap-2"
                >
                  ← Back to Guides
                </button>
                <span className="text-sm text-brown-500">
                  {selectedGuide.duration} • {selectedGuide.difficulty}
                </span>
              </div>

              <h3 className="text-2xl font-bold text-charcoal dark:text-white mb-6">
                {selectedGuide.title}
              </h3>

              <div className="space-y-6">
                {selectedGuide.content.steps.map((step, index) => (
                  <div key={index} className="border-l-4 border-gold-500 pl-4">
                    <h4 className="font-semibold text-lg text-charcoal dark:text-white mb-2">
                      Step {index + 1}: {step.title}
                    </h4>
                    <p className="text-brown-600 dark:text-brown-300 mb-2">
                      {step.description}
                    </p>
                    {step.tip && (
                      <div className="bg-gold-50 dark:bg-gold-900/20 rounded-lg p-3 mt-2">
                        <p className="text-sm text-gold-700 dark:text-gold-300">
                          <strong>💡 Pro Tip:</strong> {step.tip}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Recommended Products */}
              <div className="mt-8 pt-8 border-t border-brown-200 dark:border-brown-800">
                <h4 className="font-semibold text-lg text-charcoal dark:text-white mb-4">
                  Recommended Products
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {selectedGuide.content.products.map((product, i) => (
                    <div
                      key={i}
                      className="bg-brown-50 dark:bg-dm-surface rounded-lg p-4 text-center"
                    >
                      <div className="text-4xl mb-2">{product.image}</div>
                      <p className="text-sm font-medium text-charcoal dark:text-white">
                        {product.name}
                      </p>
                      <p className="text-gold-600 dark:text-gold-400 font-bold text-sm">
                        KSh {product.price.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FAQ Section */}
        <div>
          <h2 className="text-3xl font-bold text-charcoal dark:text-white mb-8 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {FAQS.map((faq, index) => (
              <div
                key={index}
                className="bg-white dark:bg-dm-card rounded-xl border border-brown-100 dark:border-dm-border overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4"
                >
                  <span className="font-semibold text-charcoal dark:text-white">
                    {faq.question}
                  </span>
                  {expandedFaq === index ? (
                    <FaChevronUp className="text-gold-500 flex-shrink-0" />
                  ) : (
                    <FaChevronDown className="text-brown-400 flex-shrink-0" />
                  )}
                </button>

                {expandedFaq === index && (
                  <div className="px-6 pb-6 text-brown-600 dark:text-brown-300">
                    <FaCheckCircle className="text-green-500 inline mr-2 mb-2" />
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-gold-100 to-gold-50 dark:from-gold-900/20 dark:to-gold-900/10 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-charcoal dark:text-white mb-3">
              Need Personalized Advice?
            </h3>
            <p className="text-brown-500 mb-6">
              Our hair experts are here to help you achieve your dream look
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/chat"
                className="bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold px-8 py-3 rounded-full transition-colors"
              >
                Chat with an Expert
              </Link>
              <Link
                to="/products"
                className="bg-charcoal hover:bg-charcoal/80 text-white font-semibold px-8 py-3 rounded-full transition-colors"
              >
                Shop Care Products
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HairCareHub;
