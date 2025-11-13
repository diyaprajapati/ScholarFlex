import React from 'react'

export default function LeftPanel() {
  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-start" style={{ backgroundColor: '#0A0A0A' }}>
      {/* Subtle gradient from dark to muted green */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, #0A0A0A 0%, #0A0A0A 30%, rgba(34, 197, 94, 0.08) 70%, rgba(16, 185, 129, 0.12) 100%)'
        }}
      ></div>
      
      {/* Subtle teal glow overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at top center, rgba(16, 185, 129, 0.15) 0%, transparent 60%)',
          filter: 'blur(100px)'
        }}
      ></div>
      
      {/* Subtle green glow overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at bottom center, rgba(34, 197, 94, 0.2) 0%, transparent 70%)',
          filter: 'blur(120px)'
        }}
      ></div>
      
      {/* Minimal grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34, 197, 94, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 197, 94, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      ></div>

      {/* Content Container - Left Aligned, Vertically Centered */}
      <div className="relative z-10 h-full flex items-center pl-4 sm:pl-6 md:pl-8 lg:pl-12 xl:pl-16 pr-4 sm:pr-6 md:pr-8">
        <div className="space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8">
          {/* Company Name */}
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight text-left animate-fade-in-up"
            style={{ 
              animationDelay: '0.2s',
              animationFillMode: 'both'
            }}
          >
            SCHOLARFLEX
          </h1>
          
          {/* Tagline */}
          <p 
            className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 font-medium text-left animate-fade-in-up"
            style={{ 
              animationDelay: '0.4s',
              animationFillMode: 'both'
            }}
          >
            Empowering Education, One Flex at a Time
          </p>

          {/* Description */}
          <div 
            className="animate-fade-in-up"
            style={{ 
              animationDelay: '0.6s',
              animationFillMode: 'both'
            }}
          >
            <p className="text-gray-400 text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed text-left max-w-xl">
              Welcome to ScholarFlex, your comprehensive platform for academic excellence. 
              Streamline your learning journey with powerful tools designed to enhance productivity, 
              collaboration, and success in your educational pursuits.
            </p>
          </div>
        </div>
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out;
        }
      `}</style>
    </div>
  )
}


