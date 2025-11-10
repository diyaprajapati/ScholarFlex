import React from 'react'

export default function SplitLayout({ left, right }) {
  return (
    <div className="relative min-h-screen flex">
      {/* Full-bleed background layer */}
      <div className="absolute inset-0 -z-10">
        {left}
      </div>

      {/* Content layer */}
      <div className="hidden lg:block lg:w-[55%]" />
      <div className="w-full lg:w-[45%] flex items-center justify-center px-6 py-12 z-10">
        <div className="w-full max-w-md">
          {right}
        </div>
      </div>
    </div>
  )
}


