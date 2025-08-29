"use client"

import * as React from 'react'

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className}`}
      {...props}
    />
  )
}


