export function buildMediaBlock(bannerPath: string, thumbnailPath: string, thumbnailUrl: string, dimensions: { width: number; height: number }) {
    return {
        banner: bannerPath,
        thumbnail: {
          path: thumbnailPath,
          url: thumbnailUrl,
          width: dimensions.width,
          height: dimensions.height,
          format: "jpg",
          generated_at: new Date()
        }
      };
  }