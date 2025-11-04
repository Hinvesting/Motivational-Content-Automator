export interface SceneCard {
  sceneNumber: number;
  description: string;
  visuals: string;
  dialogue: string;
  sound: string;
  imageUrl?: string | null;
  isGeneratingImage?: boolean;
}

export interface ThumbnailData {
  prompt: string;
  imageUrl?: string | null;
  isGeneratingImage?: boolean;
}

export interface VideoPrompt {
  sceneTitle: string;
  duration: string;
  dialog: string;
  camera: {
    movement: string;
    angle: string;
    lighting: string;
  };
  setting: {
    location: string;
    props: string[];
    weather: string;
  };
  action: string;
  visualCues: string;
  textOverlay: {
    content: string;
    style: string;
    transition: string;
  };
  mood: string;
  audio: {
    music: string;
    sfx: string;
  };
}

export interface Strategy {
  title: string;
  description: string;
}
