declare module 'page-flip' {
  export interface PageFlipSettings {
    width: number
    height: number
    size: 'stretch' | 'fixed'
    minWidth: number
    maxWidth: number
    minHeight: number
    maxHeight: number
    drawShadow: boolean
    flippingTime: number
    usePortrait: boolean
    startPage: number
    autoSize: boolean
    maxShadowOpacity: number
    showCover: boolean
    mobileScrollSupport: boolean
    useMouseEvents: boolean
    showPageCorners: boolean
    backgroundColor: string
  }

  export class PageFlip {
    constructor(element: HTMLElement, settings: PageFlipSettings)
    loadFromHTML(elements: NodeListOf<HTMLElement>): void
    flipNext(corner?: string): void
    flipPrev(corner?: string): void
    getCurrentPageIndex(): number
    getOrientation(): 'portrait' | 'landscape'
    on(event: 'flip', listener: (event: { data: number }) => void): void
    on(event: 'changeOrientation', listener: (event: { data: 'portrait' | 'landscape' }) => void): void
    destroy(): void
  }
}
