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

  const handleClose = () => {
    setShowContract(false)
    setAgreed(false)
    setError('')
  }

  if (!showContract) return null

  return (
    <div 
      className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4'
      onClick={handleClose}
    >
      <div 
        className='bg-white rounded-xl sm:rounded-2xl shadow-xl max-w-2xl w-full p-4 sm:p-6 md:p-8 relative max-h-[95vh] sm:max-h-[90vh] overflow-y-auto'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className='absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl'
        >
          ×
        </button>

        {/* Header */}
        <div className='text-center mb-4 sm:mb-6 pr-8'>
          <h2 className='text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2'>Contract Agreement</h2>
        </div>

        {/* Error Message */}
        {error && (
          <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
            <p className='text-red-800 text-sm'>{error}</p>
          </div>
        )}

        {/* Contract Terms */}
        <div className='mb-4 sm:mb-6 space-y-3 sm:space-y-4'>
          <div className='bg-gray-50 p-3 sm:p-4 rounded-lg'>
            <h3 className='font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base'>Terms and Conditions</h3>
            <div className='space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-700'>
              <p>1. The gown must be returned in the same condition as received.</p>
              <p>2. Any damages beyond normal wear will result in additional charges.</p>
              <p>3. The rental period starts from the pickup date and ends on the return date.</p>
              <p>4. Late returns will incur additional daily charges.</p>
              <p>5. Cancellations must be made at least 24 hours before the pickup date for a full refund.</p>
              <p>6. The gown owner reserves the right to refuse rental if the gown is damaged or unavailable.</p>
              <p>7. All measurements and fittings are preferably done in-person for the best fit.</p>
            </div>
          </div>

          <div className='bg-gray-50 p-3 sm:p-4 rounded-lg'>
            <h3 className='font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base'>Rules</h3>
            <div className='space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-700'>
              <p>• No smoking while wearing the gown</p>
              <p>• No food or drinks that may stain the gown</p>
              <p>• Keep the gown in a safe, clean environment</p>
              <p>• Do not alter or modify the gown in any way</p>
              <p>• Return the gown on time as specified in the agreement</p>
              <p>• Report any damages immediately to the owner</p>
            </div>
          </div>

          {/* Signature Field */}
          <div className='border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 bg-gray-50'>
            <label className='block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3'>
              Signature / Agreement
            </label>
            <div className='flex items-start sm:items-center gap-2 sm:gap-3'>
              <input
                type='checkbox'
                id='agreement'
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked)
                  setError('')
                }}
                className='w-4 h-4 sm:w-5 sm:h-5 text-primary rounded focus:ring-primary flex-shrink-0 mt-0.5 sm:mt-0'
              />
              <label htmlFor='agreement' className='text-xs sm:text-sm text-gray-700 cursor-pointer'>
                I agree to the terms and conditions and rules stated above
              </label>
            </div>
          </div>
        </div>

        {/* Note */}
        <p className='text-xs text-gray-500 italic mb-4 sm:mb-6 text-center'>
          PREFERABLY DONE IN-PERSON
        </p>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!agreed}
          className={`w-full py-2.5 sm:py-3 rounded-lg font-semibold text-white transition-all duration-300 text-sm sm:text-base ${
            agreed
              ? 'bg-primary hover:bg-primary-dull shadow-lg hover:shadow-xl'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          Submit &gt;&gt;
        </button>
      </div>
    </div>
  )
}

export default ContractModal

