'use client'

import React from 'react'

export interface FarmImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string
}

function resolveImageSrc(src?: unknown): string | undefined {
  if (typeof src !== 'string') return undefined
  if (src.includes('ibb.co/R4TRDhPH')) {
    return 'https://i.ibb.co/CsKRHJv0/images.jpg'
  }
  return src
}

export function FarmImage({
  src,
  alt = 'Farm stay',
  fallbackSrc = '/placeholder.jpg',
  className,
  style,
  ...props
}: FarmImageProps) {
  const resolvedSrc = resolveImageSrc(src) || fallbackSrc

  return (
    <img
      src={resolvedSrc}
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
