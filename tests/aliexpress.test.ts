import { describe, it, expect } from 'vitest'
import { aliImages, aliVideo } from '@/lib/aliexpress'

describe('aliImages', () => {
  it('dedups main + gallery images keeping order', () => {
    expect(
      aliImages({
        product_main_image_url: 'https://a/1.jpg',
        product_small_image_urls: { string: ['https://a/1.jpg', 'https://a/2.jpg'] },
      }),
    ).toEqual(['https://a/1.jpg', 'https://a/2.jpg'])
  })

  it('handles missing gallery / empty input', () => {
    expect(aliImages({ product_main_image_url: 'https://a/1.jpg' })).toEqual(['https://a/1.jpg'])
    expect(aliImages({})).toEqual([])
  })
})

describe('aliVideo', () => {
  it('normalizes protocol-relative and http to https', () => {
    expect(aliVideo({ product_video_url: '//v/x.mp4' })).toBe('https://v/x.mp4')
    expect(aliVideo({ product_video_url: 'http://v/x.mp4' })).toBe('https://v/x.mp4')
    expect(aliVideo({ product_video_url: 'https://v/x.mp4' })).toBe('https://v/x.mp4')
    expect(aliVideo({})).toBe('')
  })
})
