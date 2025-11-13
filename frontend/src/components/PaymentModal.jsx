import React, { useState } from 'react'
import { assets } from '../assets/assets'

const PaymentModal = ({ showPayment, setShowPayment, total, onContinue }) => {
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    cardName: '',
    paymentMethod: 'card' // card or google
  })
  const [error, setError] = useState('')

  const handleInputChange = (e) => {
    const { name, value } = e.target
    // Format card number with spaces
    if (name === 'cardNumber') {
      const formatted = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim()
      setPaymentData({ ...paymentData, [name]: formatted })
    } else {
      setPaymentData({ ...paymentData, [name]: value })
    }
    setError('')
  }

  const handleContinue = () => {
    // Validation
    if (paymentData.paymentMethod === 'card') {
      const cardNumber = paymentData.cardNumber.replace(/\s/g, '')
      if (!paymentData.cardNumber || cardNumber.length < 16) {
        setError('Please enter a valid card number')
        return
      }
      if (!paymentData.cardName) {
        setError('Please enter the name on card')
        return
      }
    }

    // Continue to contract agreement
    onContinue()
  }

  const handleClose = () => {
    setShowPayment(false)
    setPaymentData({
      cardNumber: '',
      cardName: '',
      paymentMethod: 'card'
    })
    setError('')
  }

  if (!showPayment) return null

  return (
    <div 
      className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
      onClick={handleClose}
    >
      <div 
        className='bg-white rounded-2xl shadow-xl max-w-md w-full p-8 relative'
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
          <p className='text-gray-600'>Total: ₱{total?.toLocaleString() || '0'}</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
            <p className='text-red-800 text-sm'>{error}</p>
          </div>
        )}

        {/* Payment Method Selection */}
        <div className='mb-6'>
          <div className='flex gap-4'>
            <button
              onClick={() => setPaymentData({ ...paymentData, paymentMethod: 'google' })}
              className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                paymentData.paymentMethod === 'google'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className='text-center'>
                <div className='text-2xl mb-2'>G</div>
                <p className='text-sm font-medium'>Google Pay</p>
              </div>
            </button>
            <button
              onClick={() => setPaymentData({ ...paymentData, paymentMethod: 'card' })}
              className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                paymentData.paymentMethod === 'card'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className='text-center'>
                <div className='text-2xl mb-2'>💳</div>
                <p className='text-sm font-medium'>Card</p>
              </div>
            </button>
          </div>
        </div>

        {/* Card Payment Form */}
        {paymentData.paymentMethod === 'card' && (
          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Number
              </label>
              <input
                type='text'
                name='cardNumber'
                value={paymentData.cardNumber}
                onChange={handleInputChange}
                placeholder='1234 5678 9101 1121'
                maxLength={19}
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Name
              </label>
              <input
                type='text'
                name='cardName'
                value={paymentData.cardName}
                onChange={handleInputChange}
                placeholder='Enter your name on card'
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all'
              />
            </div>
          </div>
        )}

        {/* Google Pay Info */}
        {paymentData.paymentMethod === 'google' && (
          <div className='p-4 bg-gray-50 rounded-lg'>
            <p className='text-sm text-gray-600 text-center'>
              You will be redirected to Google Pay to complete the payment.
            </p>
          </div>
        )}

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className='w-full mt-6 py-3 bg-gray-400 text-white rounded-lg font-semibold hover:bg-gray-500 transition-colors'
        >
          Continue
        </button>
      </div>
    </div>
  )
}

export default PaymentModal

