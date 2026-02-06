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
      className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto'
      onClick={handleClose}
    >
      <div 
        className='bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8 relative my-8'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className='absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl'
        >
          ×
        </button>

        {/* Header */}
        <div className='text-center mb-6'>
          <h2 className='text-3xl font-bold text-gray-900 mb-2'>Payment</h2>
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4'>
            <div className='space-y-2'>
              <div className='flex justify-between items-center'>
                <span className='text-gray-600 font-medium'>Total Amount:</span>
                <span className='text-2xl font-bold text-gray-900'>₱{total?.toLocaleString() || '0'}</span>
              </div>
              {paymentData.method === 'gcash' && (
                <>
                  <div className='flex justify-between items-center text-green-700'>
                    <span className='font-medium'>Deposit Required (50%):</span>
                    <span className='text-xl font-bold'>₱{depositAmount?.toLocaleString() || '0'}</span>
                  </div>
                  <div className='flex justify-between items-center text-sm text-gray-600 pt-2 border-t border-blue-200'>
                    <span>Balance (pay on pickup):</span>
                    <span className='font-semibold'>₱{remainingBalance?.toLocaleString() || '0'}</span>
                  </div>
                </>
              )}
              {paymentData.method === 'in_store' && (
                <div className='flex justify-between items-center text-sm text-gray-600 pt-2 border-t border-blue-200'>
                  <span>Full amount to be paid in-store:</span>
                  <span className='font-semibold text-lg text-green-600'>₱{total?.toLocaleString() || '0'}</span>
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
        <div className='mb-6 bg-gray-50 rounded-lg p-4'>
          <h3 className='font-semibold text-gray-900 mb-3'>Select payment method</h3>
          <div className='flex flex-col sm:flex-row gap-3'>
            <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer bg-white ${paymentData.method === 'gcash' ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'}`}>
              <input type='radio' name='method' value='gcash' checked={paymentData.method === 'gcash'} onChange={handleInputChange} />
              <div>
                <p className='font-semibold text-gray-900'>GCash</p>
                <p className='text-xs text-gray-500'>Upload proof of payment</p>
              </div>
            </label>
            <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer bg-white ${paymentData.method === 'in_store' ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'}`}>
              <input type='radio' name='method' value='in_store' checked={paymentData.method === 'in_store'} onChange={handleInputChange} />
              <div>
                <p className='font-semibold text-gray-900'>Pay In-Store</p>
                <p className='text-xs text-gray-500'>Cash payment at the shop</p>
              </div>
            </label>
          </div>
        </div>

        {/* Payment Instructions (GCash only) */}
        {paymentData.method === 'gcash' && (
        <div className='mb-6 bg-gray-50 rounded-lg p-4'>
          <h3 className='font-semibold text-gray-900 mb-3 flex items-center gap-2'>
            <span className='bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm'>1</span>
            Scan QR Code with GCash
          </h3>
          
          {/* QR Code Display */}
          <div className='flex justify-center my-6'>
            <div className='bg-white p-4 rounded-xl shadow-md border-2 border-primary'>
              <img 
                src={assets.gcash_qr} 
                alt="GCash QR Code" 
                className='w-48 h-48 object-contain'
              />
              <p className='text-center text-sm text-gray-600 mt-2 font-medium'>
                Pay ₱{depositAmount?.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        )}

        {paymentData.method === 'gcash' && (
        <>
        {/* Reference Number Input */}
        <div className='mb-6'>
          <h3 className='font-semibold text-gray-900 mb-3 flex items-center gap-2'>
            <span className='bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm'>2</span>
            Enter Reference Number
          </h3>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            GCash Reference Number *
          </label>
          <input
            type='text'
            name='referenceNumber'
            value={paymentData.referenceNumber}
            onChange={handleInputChange}
            placeholder='e.g., 1234567890123'
            className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
          />
          <p className='text-xs text-gray-500 mt-1'>
            Found in your GCash transaction receipt
          </p>
        </div>

        {/* Screenshot Upload */}
        <div className='mb-6'>
          <h3 className='font-semibold text-gray-900 mb-3 flex items-center gap-2'>
            <span className='bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm'>3</span>
            Upload Transaction Screenshot
          </h3>
          
          {!paymentData.screenshotPreview ? (
            <label className='block'>
              <div className='border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all'>
                <img src={assets.upload_icon} alt="upload" className='w-12 h-12 mx-auto mb-3 opacity-50' />
                <p className='text-gray-600 font-medium mb-1'>Click to upload screenshot</p>
                <p className='text-sm text-gray-500'>PNG or JPG (max 5MB)</p>
              </div>
              <input
                type='file'
                accept='image/png,image/jpeg,image/jpg'
                onChange={handleFileChange}
                className='hidden'
              />
            </label>
          ) : (
            <div className='relative'>
              <img 
                src={paymentData.screenshotPreview} 
                alt="Transaction screenshot preview" 
                className='w-full max-h-64 object-contain border border-gray-300 rounded-lg'
              />
              <button
                onClick={() => setPaymentData({ ...paymentData, screenshot: null, screenshotPreview: null })}
                className='absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors'
              >
                ×
              </button>
              <div className='mt-2 flex items-center gap-2 text-green-600'>
                <img src={assets.check_icon} alt="check" className='w-5 h-5' />
                <p className='text-sm font-medium'>Screenshot uploaded successfully</p>
              </div>
            </div>
          )}
        </div>

        {/* Important Note */}
        <div className='mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
          <p className='text-sm text-yellow-800'>
            <strong>Note:</strong> Your booking will be pending until the owner verifies your payment. 
            You'll receive a confirmation once verified. The remaining balance of ₱{remainingBalance?.toLocaleString()} 
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
        <button
          onClick={handleContinue}
          disabled={uploading}
          className='w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dull transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed'
        >
          {uploading ? 'Processing...' : 'Continue to Contract Agreement'}
        </button>
      </div>
    </div>
  )
}

export default PaymentModal

