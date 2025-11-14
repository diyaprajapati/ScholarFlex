import React from 'react'

export default function SplitLayout({ left, right }) {
  return (
    <div className="relative min-h-screen flex flex-col lg:flex-row">
      {/* Full-bleed background layer */}
      <div className="absolute inset-0 -z-10">
        {left}
      </div>

      {/* Content layer */}
      <div className="hidden lg:block lg:w-[55%] xl:w-[60%]" />
      <div className="w-full lg:w-[45%] xl:w-[40%] flex items-center justify-center px-4 sm:px-5 md:px-6 lg:px-8 xl:px-10 py-8 sm:py-10 md:py-12 z-10">
        <div className="w-full max-w-md">
          {right}
        </div>
      </div>
    </div>
  )
}


