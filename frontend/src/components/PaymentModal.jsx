import React, { useState } from 'react'
import { assets } from '../assets/assets'

const PaymentModal = ({ showPayment, setShowPayment, total, onContinue }) => {
  const [paymentData, setPaymentData] = useState({
    method: 'gcash',
    referenceNumber: '',
    screenshot: null,
    screenshotPreview: null
  })
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  // Calculate deposit (50% of total) - only for GCash
  const depositAmount = Math.round(total * 0.5)
  const remainingBalance = total - depositAmount
  
  // For in-store, show full amount
  const displayAmount = paymentData.method === 'in_store' ? total : depositAmount

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setPaymentData({ ...paymentData, [name]: value })
    setError('')
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    
    if (!file) return

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PNG or JPG image')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPaymentData({
        ...paymentData,
        screenshot: file,
        screenshotPreview: reader.result
      })
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const handleContinue = () => {
    if (paymentData.method === 'in_store') {
      onContinue(paymentData)
      return
    }

    // GCash validation
    if (!paymentData.referenceNumber || paymentData.referenceNumber.trim() === '') {
      setError('Please enter the GCash reference number')
      return
    }

    if (!paymentData.screenshot) {
      setError('Please upload a screenshot of your transaction')
      return
    }

    if (paymentData.referenceNumber.length < 10) {
      setError('Please enter a valid reference number (at least 10 characters)')
      return
    }

    onContinue(paymentData)
  }

  const handleClose = () => {
    setShowPayment(false)
    setPaymentData({
      method: 'gcash',
      referenceNumber: '',
      screenshot: null,
      screenshotPreview: null
    })
    setError('')
  }

  if (!showPayment) return null

  return (
    <div 
      className='fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-2 sm:p-4 transition-all duration-300'
      onClick={handleClose}
    >
      <div 
        className='bg-white rounded-[40px] shadow-[0_40px_100px_rgba(1,62,141,0.15)] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 sm:p-10 relative border border-primary/5 backdrop-blur-xl'
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
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Checkout</span>
          </div>
          <h2 className='text-3xl font-black text-primary mb-6'>Payment Details</h2>
          
          <div className='bg-[#FDFDFF] border border-primary/5 rounded-[32px] p-6 sm:p-8 shadow-inner relative overflow-hidden'>
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className='space-y-4 relative z-10'>
              <div className='flex justify-between items-center'>
                <span className='text-[10px] font-black text-gray-400 uppercase tracking-widest'>Total Amount</span>
                <div className='text-2xl font-black text-primary flex items-baseline gap-1'>
                  <span className="text-secondary text-sm">₱</span>
                  <span>{total?.toLocaleString() || '0'}</span>
                </div>
              </div>
              
              {paymentData.method === 'gcash' && (
                <>
                  <div className='flex justify-between items-center pt-4 border-t border-primary/5'>
                    <span className='text-[10px] font-black text-gray-400 uppercase tracking-widest'>Deposit Required (50%)</span>
                    <div className='text-xl font-black text-secondary flex items-baseline gap-1'>
                      <span className="text-xs">₱</span>
                      <span>{depositAmount?.toLocaleString() || '0'}</span>
                    </div>
                  </div>
                  <div className='bg-primary/5 rounded-2xl p-4 flex justify-between items-center'>
                    <span className='text-[10px] font-black text-primary/60 uppercase tracking-widest'>Balance on Pickup</span>
                    <span className='font-black text-primary'>₱{remainingBalance?.toLocaleString()}</span>
                  </div>
                </>
              )}
              
              {paymentData.method === 'in_store' && (
                <div className='bg-green-50 rounded-2xl p-4 flex items-center gap-3'>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <p className='text-xs font-bold text-green-700'>Full amount to be settled at the shop</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
            <p className='text-red-800 text-sm'>{error}</p>
          </div>
        )}

        {/* Payment Method */}
        <div className='mb-8'>
          <label className='block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 pl-2'>Choose Payment Method</label>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <button 
              onClick={() => setPaymentData({ ...paymentData, method: 'gcash' })}
              className={`flex items-center gap-4 p-5 rounded-[24px] border-2 transition-all text-left ${
                paymentData.method === 'gcash' 
                ? 'border-primary bg-primary/5 shadow-inner' 
                : 'border-primary/5 hover:border-primary/20 bg-[#FDFDFF]'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                paymentData.method === 'gcash' ? 'bg-primary text-white shadow-lg' : 'bg-white text-gray-300 border border-primary/5'
              }`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className={`font-black text-sm ${paymentData.method === 'gcash' ? 'text-primary' : 'text-gray-400'}`}>GCash online</p>
                <p className='text-[10px] text-gray-400 font-bold'>Instant Deposit</p>
              </div>
            </button>

            <button 
              onClick={() => setPaymentData({ ...paymentData, method: 'in_store' })}
              className={`flex items-center gap-4 p-5 rounded-[24px] border-2 transition-all text-left ${
                paymentData.method === 'in_store' 
                ? 'border-secondary bg-secondary/5 shadow-inner' 
                : 'border-primary/5 hover:border-primary/20 bg-[#FDFDFF]'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                paymentData.method === 'in_store' ? 'bg-secondary text-white shadow-lg' : 'bg-white text-gray-300 border border-primary/5'
              }`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className={`font-black text-sm ${paymentData.method === 'in_store' ? 'text-secondary' : 'text-gray-400'}`}>In-Store pay</p>
                <p className='text-[10px] text-gray-400 font-bold'>Pay upon visit</p>
              </div>
            </button>
          </div>
        </div>

        {/* Payment Instructions (GCash only) */}
        {paymentData.method === 'gcash' && (
        <div className='mb-8'>
          <div className='flex items-center gap-3 mb-6'>
            <div className='bg-primary text-white rounded-xl w-8 h-8 flex items-center justify-center font-black shadow-lg'>1</div>
            <h3 className='font-black text-primary'>Scan QR Code</h3>
          </div>
          
          <div className='flex justify-center'>
            <div className='bg-white p-6 rounded-[32px] shadow-[0_20px_50px_rgba(1,62,141,0.1)] border-2 border-primary/20 relative group'>
              <div className="absolute inset-0 bg-primary/5 rounded-[30px] opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <img 
                src={assets.gcash_qr} 
                alt="GCash QR Code" 
                className='w-48 h-48 sm:w-56 sm:h-56 object-contain relative z-10'
              />
              <div className='mt-4 text-center relative z-10'>
                <p className='text-[10px] font-black text-gray-400 uppercase tracking-widest'>Amount to pay</p>
                <p className='text-xl font-black text-secondary'>₱{depositAmount?.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
        )}

        {paymentData.method === 'gcash' && (
        <>
        {/* Reference Number Input */}
        <div className='mb-8'>
          <div className='flex items-center gap-3 mb-6'>
            <div className='bg-primary text-white rounded-xl w-8 h-8 flex items-center justify-center font-black shadow-lg'>2</div>
            <h3 className='font-black text-primary'>Reference Number</h3>
          </div>
          <div className="relative">
            <input
              type='text'
              name='referenceNumber'
              value={paymentData.referenceNumber}
              onChange={handleInputChange}
              placeholder='Enter 13-digit reference number'
              className='w-full px-6 py-5 bg-[#FDFDFF] border border-primary/10 rounded-[20px] focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all font-black text-primary placeholder:text-gray-300'
            />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-primary/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className='text-[10px] font-black text-gray-400 uppercase tracking-widest mt-3 ml-2'>
            Required for payment verification
          </p>
        </div>

        {/* Screenshot Upload */}
        <div className='mb-10'>
          <div className='flex items-center gap-3 mb-6'>
            <div className='bg-primary text-white rounded-xl w-8 h-8 flex items-center justify-center font-black shadow-lg'>3</div>
            <h3 className='font-black text-primary'>Proof of Payment</h3>
          </div>
          
          {!paymentData.screenshotPreview ? (
            <label className='block'>
              <div className='border-2 border-dashed border-primary/10 bg-[#FDFDFF] rounded-[32px] p-10 text-center cursor-pointer hover:border-primary hover:bg-white hover:shadow-xl transition-all group'>
                <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <p className='text-sm font-black text-primary mb-1'>Upload Receipt Screenshot</p>
                <p className='text-[10px] text-gray-400 font-bold uppercase tracking-widest'>PNG, JPG up to 5MB</p>
              </div>
              <input
                type='file'
                accept='image/png,image/jpeg,image/jpg'
                onChange={handleFileChange}
                className='hidden'
              />
            </label>
          ) : (
            <div className='relative group'>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[32px] z-10 flex items-center justify-center">
                <button
                  onClick={() => setPaymentData({ ...paymentData, screenshot: null, screenshotPreview: null })}
                  className='bg-white text-red-500 font-black px-6 py-3 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-xl'
                >
                  Remove & Replace
                </button>
              </div>
              <img 
                src={paymentData.screenshotPreview} 
                alt="Preview" 
                className='w-full max-h-80 object-contain bg-white border border-primary/10 rounded-[32px] shadow-sm'
              />
              <div className='mt-4 flex items-center gap-3 bg-green-50 p-4 rounded-2xl border border-green-100'>
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className='text-xs font-black text-green-700 uppercase tracking-widest'>Verification Ready</p>
              </div>
            </div>
          )}
        </div>

        {/* Important Note */}
        <div className='mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
          <p className='text-sm text-yellow-800'>
            <strong>Note:</strong> Your booking will be pending until the owner verifies your payment. 
            You'll receive a confirmation once verified. The remaining balance of <span className="text-primary-dull">₱</span><span className="font-bold text-primary-dull">{remainingBalance?.toLocaleString()}</span> 
            will be paid during pickup.
          </p>
        </div>
        </>
        )}

        {paymentData.method === 'in_store' && (
          <div className='mb-6 bg-green-50 border border-green-200 rounded-lg p-4'>
            <p className='text-sm text-green-800'>
              You selected <strong>Pay In-Store</strong>. You can pay cash at the shop during your visit.
            </p>
          </div>
        )}

        {/* Continue Button */}
        <div className="mt-10">
          <button
            onClick={handleContinue}
            disabled={uploading}
            className={`w-full py-6 rounded-[24px] font-black text-base uppercase tracking-widest transition-all duration-500 relative flex items-center justify-center gap-3 active:scale-95 ${!uploading
                ? 'bg-primary text-white shadow-[0_15px_30px_rgba(1,62,141,0.2)] hover:shadow-[0_20px_40px_rgba(1,62,141,0.3)] hover:-translate-y-1'
                : 'bg-gray-100 text-gray-400 border border-primary/5 cursor-not-allowed'
              }`}
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-b-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Continue to Agreement</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PaymentModal

