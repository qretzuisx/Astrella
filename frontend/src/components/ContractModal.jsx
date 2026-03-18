import React, { useState } from 'react'

const ContractModal = ({ showContract, setShowContract, onSubmit }) => {
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!agreed) {
      setError('Please agree to the contract terms')
      return
    }

    onSubmit()
  }

  // Reset modal state when closing
  const handleClose = () => {
    setShowContract(false)
    setAgreed(false)
    setError('')
  }

  // Purely conditional rendering: Do not mount/render if not explicitly shown
  if (!showContract) return null

  return (
    <div 
      className='fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-2 sm:p-4 transition-all duration-300'
      onClick={handleClose}
    >
      <div 
        className='bg-white rounded-[40px] shadow-[0_40px_100px_rgba(1,62,141,0.15)] max-w-2xl w-full p-8 sm:p-10 relative max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-primary/5 backdrop-blur-xl'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className='absolute top-6 right-6 text-gray-400 hover:text-primary transition-colors'
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className='text-center mb-10'>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-1 bg-primary rounded-full"></div>
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Agreement</span>
          </div>
          <h2 className='text-3xl font-black text-primary'>Contract Terms</h2>
        </div>

        {/* Error Message */}
        {error && (
          <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
            <p className='text-red-800 text-sm'>{error}</p>
          </div>
        )}

        {/* Contract Terms */}
        <div className='mb-10 space-y-6'>
          <div className='bg-[#FDFDFF] p-6 sm:p-8 rounded-[32px] border border-primary/5 shadow-inner relative overflow-hidden'>
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <h3 className='font-black text-primary mb-4 flex items-center gap-3 relative z-10'>
              <div className="w-7 h-7 bg-primary text-white rounded-xl flex items-center justify-center text-xs font-black shadow-lg shadow-primary/20">1</div>
              Terms and Conditions
            </h3>
            <div className='space-y-3 text-xs sm:text-sm text-gray-600 font-bold relative z-10'>
              <p className="flex gap-3"><span className="text-secondary">•</span> The gown must be returned in its original premium condition.</p>
              <p className="flex gap-3"><span className="text-secondary">•</span> Damages beyond normal wear incur additional restoration charges.</p>
              <p className="flex gap-3"><span className="text-secondary">•</span> Rental period is fixed from pickup to return date.</p>
              <p className="flex gap-3"><span className="text-secondary">•</span> Late returns incur standard overlapping daily fees.</p>
              <p className="flex gap-3"><span className="text-secondary">•</span> 24h notice required for full refund on cancellations.</p>
            </div>
          </div>

          <div className='bg-[#FDFDFF] p-6 sm:p-8 rounded-[32px] border border-secondary/5 shadow-inner relative overflow-hidden'>
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <h3 className='font-black text-secondary mb-4 flex items-center gap-3 relative z-10'>
              <div className="w-7 h-7 bg-primary text-white rounded-xl flex items-center justify-center text-xs font-black shadow-lg shadow-primary/20">2</div>
              Care Rules
            </h3>
            <div className='space-y-3 text-xs sm:text-sm text-gray-600 font-bold relative z-10'>
              <p className="flex gap-3"><span className="text-primary">•</span> No smoking or exposure to strong odors.</p>
              <p className="flex gap-3"><span className="text-primary">•</span> Avoid staining food or celebratory refreshments.</p>
              <p className="flex gap-3"><span className="text-primary">•</span> Maintain in a secure, moisture-free environment.</p>
              <p className="flex gap-3"><span className="text-primary">•</span> No structural alterations or modifications allowed.</p>
            </div>
          </div>

          {/* Signature Field */}
          <div className='border-2 border-dashed border-primary/10 rounded-[32px] p-8 bg-[#FDFDFF] group hover:border-primary/30 transition-all'>
            <div className='flex items-start gap-4'>
              <div className="relative mt-1">
                <input
                  type='checkbox'
                  id='agreement'
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked)
                    setError('')
                  }}
                  className='peer w-6 h-6 border-2 border-primary/20 rounded-lg checked:bg-primary checked:border-primary transition-all appearance-none cursor-pointer'
                />
                <svg className="absolute top-1 left-1 w-4 h-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <label htmlFor='agreement' className='text-sm font-black text-primary/80 cursor-pointer leading-tight'>
                I hereby acknowledge and agree to comply with the premium terms, conditions, and care rules stated above.
              </label>
            </div>
          </div>
        </div>

        {/* Note */}
        <p className='text-xs text-gray-500 italic mb-4 sm:mb-6 text-center'>
          PREFERABLY DONE IN-PERSON
        </p>

        {/* Submit Button */}
        <div className="mt-10">
          <button
            onClick={handleSubmit}
            disabled={!agreed}
            className={`w-full py-6 rounded-[24px] font-black text-base uppercase tracking-widest transition-all duration-500 relative flex items-center justify-center gap-3 active:scale-95 ${agreed
                ? 'bg-primary text-white shadow-[0_15px_30px_rgba(1,62,141,0.2)] hover:shadow-[0_20px_40px_rgba(1,62,141,0.3)] hover:-translate-y-1'
                : 'bg-gray-100 text-gray-400 border border-primary/5 cursor-not-allowed'
              }`}
          >
            <span>Complete Order</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ContractModal

