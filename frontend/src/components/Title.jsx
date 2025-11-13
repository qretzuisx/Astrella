import React from 'react'

const Title = ({ title, subTitle, align }) => {
  return (
    <div
      className={`flex flex-col justify-center items-center text-center
      ${align === "left" ? "md:items-start md:text-left" : ""}`}
    >
      <h1 className="font-semibold text-4xl md:text-[40px] mb-2">
        {title}
      </h1>
      <p className="text-sm md:text-base text-gray-500/90 max-w-[600px]">
        {subTitle}
      </p>
    </div>
  )
}

export default Title
