import Link from 'next/link'

interface ProductCardProps {
  id: string
  title: string
  imageUrl: string
  price: number
  currency: string
  affiliateUrl: string
  rating: number
  reviews: number
  typeFishing: string
}

export default function ProductCard({
  id,
  title,
  imageUrl,
  price,
  currency,
  affiliateUrl,
  rating,
  reviews,
  typeFishing
}: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <Link href={`/products/${id}`}>
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
        />
      </Link>
      <div className="p-4">
        <span className="text-xs font-semibold text-blue-600 uppercase">
          {typeFishing}
        </span>
        <Link href={`/products/${id}`}>
          <h3 className="mt-1 text-lg font-semibold text-gray-900 hover:text-blue-600 transition line-clamp-2">
            {title}
          </h3>
        </Link>
        <div className="mt-2 flex items-center">
          <span className="text-yellow-500">★</span>
          <span className="ml-1 text-sm text-gray-600">{rating.toFixed(1)}</span>
          <span className="ml-2 text-sm text-gray-500">({reviews} reseñas)</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-2xl font-bold text-gray-900">
            {price} {currency}
          </span>
          <a
            href={affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
          >
            Ver en AliExpress
          </a>
        </div>
      </div>
    </div>
  )
}