import React from 'react'
import Title from './Title'
import { assets, dummyGownData } from '../assets/assets'
import GownCard from './GownCard'
import { useNavigate } from 'react-router-dom'

const FeaturedSection = () => {

    const navigate = useNavigate()


  return (
    <div className='flex flex-col items-center py-24 px-6 md:px-16
    lg:px-24 xl:px-32'>

        <div>
            <Title title='Featured Gowns' 
            subTitle='Explore our selection of marverlous gowns available for your next event.'/>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-18'>
        {
            dummyGownData.slice(0, 6).map((gown)=>(
                <div key={gown._id}>
                    <GownCard gown={gown}/>
                </div>
            ))
        }
        </div>

        <button onClick={()=> {
            navigate('/gowns'); scrollTo(0,0)
        }} 
        className='flex items-center justify-center gap-2 px-6 py-2 border 
        border-borderColor hover:bg-gray-50 rounded-md mt-18 cursor-pointer'>
            Explore all gown <img src={assets.arrow_icon} alt="arrow" />
        </button>

    </div>
  )
}

export default FeaturedSection