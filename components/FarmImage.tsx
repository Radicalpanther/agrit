'use client'

import React from 'react'

export interface FarmImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string
}

export function FarmImage({
  src,
  alt = 'Farm stay',
  fallbackSrc = '/placeholder.jpg',
  className,
  style,
  ...props
}: FarmImageProps) {
  return (
    <img
      src={src || fallbackSrc}
      alt={alt}
      className={className}
      style={style}
      onError={(e) => {
        if (!e.currentTarget.src.endsWith(fallbackSrc)) {
          e.currentTarget.onerror = null
          e.currentTarget.src = fallbackSrc
        }
      }}
      {...props}
    />
  )
}
