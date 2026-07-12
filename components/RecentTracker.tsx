'use client'

import { useEffect } from 'react'
import { recordRecent, type ProductSnapshot } from '@/lib/product-history'

/** Records the current product into "recently viewed" on mount. Renders nothing. */
export default function RecentTracker(props: ProductSnapshot) {
  useEffect(() => {
    recordRecent(props)
  }, [props])
  return null
}
