export interface MemeConcept {
  id: string;
  caption: string;
  imagePrompt: string;
}

export interface Meme extends MemeConcept {
  imageUrl?: string;
  isLoadingImage: boolean;
  error?: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  GENERATING_CONCEPTS = 'GENERATING_CONCEPTS',
  GENERATING_IMAGES = 'GENERATING_IMAGES',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}