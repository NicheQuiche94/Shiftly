'use client'

import { useState, useEffect } from 'react'

interface TypingAnimationProps {
  text: string
  speed?: number
}

export default function TypingAnimation({ text, speed = 80 }: TypingAnimationProps) {
  const [typedText, setTypedText] = useState('')
  
  useEffect(() => {
    let currentIndex = 0
    const typingInterval = setInterval(() => {
      if (currentIndex <= text.length) {
        setTypedText(text.slice(0, currentIndex))
        currentIndex++
      } else {
        clearInterval(typingInterval)
      }
    }, speed)

    return () => clearInterval(typingInterval)
  }, [text, speed])

  return (
    <p className="text-xl lg:text-2xl text-gray-600 font-medium">
      {typedText}
      <span className="inline-block w-0.5 h-6 bg-pink-600 ml-1 animate-pulse"></span>
    </p>
  )
}