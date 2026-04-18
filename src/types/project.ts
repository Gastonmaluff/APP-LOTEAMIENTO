export type AlignmentPoint = {
  x: number;
  y: number;
};

export type MapAlignmentConfig = {
  backgroundImage: string | null;
  backgroundImageStoragePath: string | null;
  svgTransform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
    opacity: number;
  };
  backgroundTransform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
  visual: {
    satelliteOpacity: number;
    overlayColor: string;
    overlayOpacity: number;
    blurPx: number;
  };
  pointAlignment: {
    svgPoints: AlignmentPoint[];
    backgroundPoints: AlignmentPoint[];
  };
};

export type ProjectSettings = {
  slug: string;
  name: string;
  publicRoute: string;
  mapAlignment: MapAlignmentConfig;
};

export const defaultMapAlignmentConfig: MapAlignmentConfig = {
  backgroundImage: null,
  backgroundImageStoragePath: null,
  svgTransform: {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1
  },
  backgroundTransform: {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0
  },
  visual: {
    satelliteOpacity: 0.28,
    overlayColor: "#e6dfd5",
    overlayOpacity: 0.48,
    blurPx: 1.5
  },
  pointAlignment: {
    svgPoints: [],
    backgroundPoints: []
  }
};
