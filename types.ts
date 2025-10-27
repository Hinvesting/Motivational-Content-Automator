
export interface Strategy {
  title: string;
  description: string;
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
