declare module "page-flip" {
  export interface PageFlipSettings {
    width: number;
    height: number;
    size?: "fixed" | "stretch";
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    showCover?: boolean;
    usePortrait?: boolean;
    mobileScrollSupport?: boolean;
    drawShadow?: boolean;
    maxShadowOpacity?: number;
    flippingTime?: number;
    startPage?: number;
    swipeDistance?: number;
    showPageCorners?: boolean;
    autoSize?: boolean;
  }

  export class PageFlip {
    constructor(element: HTMLElement, settings: PageFlipSettings);
    loadFromImages(images: string[]): void;
    flipNext(corner?: "top" | "bottom"): void;
    flipPrev(corner?: "top" | "bottom"): void;
    turnToPage(page: number): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    getOrientation(): "portrait" | "landscape";
    on(event: "flip" | "changeOrientation" | "changeState" | "init" | "update", callback: (e: { data: number | string | object }) => void): PageFlip;
    destroy(): void;
  }
}
