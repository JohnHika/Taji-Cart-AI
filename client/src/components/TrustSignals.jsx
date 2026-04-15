import React from 'react';
import {
  FaCheckCircle,
  FaAward,
  FaTruck,
  FaShieldAlt,
  FaStar,
  FaUsers,
  FaLeaf,
  FaGlobe,
  FaHeart,
  FaMedal,
  FaCertificate,
  FaHandshake,
} from 'react-icons/fa';

const TRUST_BADGES = [
  {
    icon: FaCertificate,
    title: '100% Certified Remy Human Hair',
    description: 'Cuticle-aligned, tangle-free premium quality',
    color: 'text-gold-600',
    bg: 'bg-gold-100 dark:bg-gold-900/20',
  },
  {
    icon: FaMedal,
    title: 'Double-Wefted Construction',
    description: 'Extra durability, minimal shedding guaranteed',
    color: 'text-blue-600',
    bg: 'bg-blue-100 dark:bg-blue-900/20',
  },
  {
    icon: FaLeaf,
    title: 'Ethically Sourced',
    description: 'Fair trade practices, sustainable sourcing',
    color: 'text-green-600',
    bg: 'bg-green-100 dark:bg-green-900/20',
  },
  {
    icon: FaShieldAlt,
    title: 'Quality Guarantee',
    description: '30-day money-back guarantee on all products',
    color: 'text-purple-600',
    bg: 'bg-purple-100 dark:bg-purple-900/20',
  },
];

const QUALITY_FEATURES = [
  {
    icon: FaHandshake,
    title: 'Tangle-Free Promise',
    description: 'Our cuticle-aligned technology ensures smooth, tangle-free hair for up to 12 months with proper care.',
    stat: '99%',
    statLabel: 'tangle-free rating',
  },
  {
    icon: FaHeart,
    title: 'Minimal Shedding',
    description: 'Double-wefted construction means less shedding and more wear. Enjoy full, voluminous hair longer.',
    stat: '<2%',
    statLabel: 'shedding rate',
  },
  {
    icon: FaUsers,
    title: 'Trusted by 10,000+',
    description: 'Kenyan women trust Nawiri Hair for quality, affordability, and authentic human hair.',
    stat: '10K+',
    statLabel: 'happy customers',
  },
  {
    icon: FaStar,
    title: '5-Star Reviews',
    description: 'Our customers rate us 4.9/5 stars. Real reviews, real results from real Kenyan women.',
    stat: '4.9/5',
    statLabel: 'average rating',
  },
];

const DELIVERY_PROMISES = [
  {
    icon: FaTruck,
    title: 'Same-Day Dispatch',
    description: 'Order before 2PM for same-day dispatch within Nairobi',
  },
  {
    icon: FaGlobe,
    title: 'Nationwide Delivery',
    description: 'Fast shipping to all 47 counties via trusted couriers',
  },
  {
    icon: FaAward,
    title: 'Secure Packaging',
    description: 'Premium packaging ensures your hair arrives in perfect condition',
  },
];

function TrustSignals({ variant = 'full' }) {
  if (variant === 'compact') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {TRUST_BADGES.slice(0, 4).map((badge, index) => (
          <div
            key={index}
            className={`${badge.bg} rounded-xl p-4 text-center transition-transform hover:scale-105`}
          >
            <badge.icon className={`text-3xl ${badge.color} mx-auto mb-2`} />
            <h4 className="font-semibold text-charcoal dark:text-white text-sm">
              {badge.title}
            </h4>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Trust Badges Section */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {TRUST_BADGES.map((badge, index) => (
          <div
            key={index}
            className={`${badge.bg} rounded-2xl p-6 text-center transition-all hover:shadow-lg hover:-translate-y-1`}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white dark:bg-dm-card mb-4 shadow-md">
              <badge.icon className={`text-3xl ${badge.color}`} />
            </div>
            <h3 className="font-bold text-charcoal dark:text-white mb-2">
              {badge.title}
            </h3>
            <p className="text-sm text-brown-500 dark:text-brown-400">
              {badge.description}
            </p>
          </div>
        ))}
      </div>

      {/* Quality Features Section */}
      <div className="bg-gradient-to-br from-charcoal to-charcoal/80 dark:from-dm-surface dark:to-dm-surface rounded-3xl p-8 md:p-12 mb-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold-100 dark:bg-gold-900/30 mb-4">
            <FaAward className="text-2xl text-gold-600" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            The Nawiri Quality Standard
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto">
            We don't just sell hair. We deliver confidence, quality, and peace of mind.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {QUALITY_FEATURES.map((feature, index) => (
            <div
              key={index}
              className="bg-white/10 backdrop-blur rounded-xl p-6 text-center"
            >
              <feature.icon className="text-4xl text-gold-400 mx-auto mb-4" />
              <div className="text-4xl font-bold text-white mb-1">
                {feature.stat}
              </div>
              <p className="text-gold-300 text-sm font-semibold mb-3">
                {feature.statLabel}
              </p>
              <h4 className="font-semibold text-white mb-2">{feature.title}</h4>
              <p className="text-sm text-white/60">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Promises */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {DELIVERY_PROMISES.map((promise, index) => (
          <div
            key={index}
            className="bg-white dark:bg-dm-card rounded-xl p-6 border border-brown-100 dark:border-dm-border flex items-start gap-4"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center">
              <promise.icon className="text-xl text-gold-600" />
            </div>
            <div>
              <h4 className="font-semibold text-charcoal dark:text-white mb-1">
                {promise.title}
              </h4>
              <p className="text-sm text-brown-500 dark:text-brown-400">
                {promise.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Guarantee Banner */}
      <div className="bg-gradient-to-r from-gold-500 to-gold-400 rounded-2xl p-8 md:p-12 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur mb-6">
          <FaShieldAlt className="text-4xl text-charcoal" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-charcoal mb-4">
          Our Iron-Clad Guarantee
        </h2>
        <p className="text-charcoal/80 max-w-2xl mx-auto mb-8 text-lg">
          Not satisfied with your purchase? Return it within 30 days for a full refund.
          No questions asked. We stand behind our quality 100%.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
            <FaCheckCircle className="text-charcoal" />
            <span className="text-charcoal font-semibold">30-Day Returns</span>
          </div>
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
            <FaCheckCircle className="text-charcoal" />
            <span className="text-charcoal font-semibold">Free Exchanges</span>
          </div>
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
            <FaCheckCircle className="text-charcoal" />
            <span className="text-charcoal font-semibold">Full Refund</span>
          </div>
        </div>
      </div>

      {/* Customer Testimonials Preview */}
      <div className="mt-12">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-charcoal dark:text-white mb-2">
            What Our Customers Say
          </h3>
          <div className="flex items-center justify-center gap-2">
            {[...Array(5)].map((_, i) => (
              <FaStar key={i} className="text-gold-500" />
            ))}
            <span className="text-brown-500 ml-2">4.9/5 from 2,500+ reviews</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              name: 'Grace W.',
              location: 'Nairobi',
              text: 'Best hair I have ever bought! So soft and natural. I get compliments everywhere I go.',
              rating: 5,
            },
            {
              name: 'Sarah K.',
              location: 'Mombasa',
              text: 'Finally found a trusted hair seller in Kenya. Quality is consistent and delivery is fast.',
              rating: 5,
            },
            {
              name: 'Michelle O.',
              location: 'Kisumu',
              text: 'The bundle deals are amazing! Got a full head of hair and saved so much money.',
              rating: 5,
            },
          ].map((testimonial, index) => (
            <div
              key={index}
              className="bg-white dark:bg-dm-card rounded-xl p-6 border border-brown-100 dark:border-dm-border"
            >
              <div className="flex items-center gap-1 mb-3">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <FaStar key={i} className="text-gold-500 text-sm" />
                ))}
              </div>
              <p className="text-brown-600 dark:text-brown-300 mb-4 italic">
                "{testimonial.text}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center font-bold text-gold-600">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-charcoal dark:text-white text-sm">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-brown-500">{testimonial.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TrustSignals;
