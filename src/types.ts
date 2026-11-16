export type ProjectShape = 'frontend' | 'backend' | 'turbo';
export type BackendOption =
  | 'fastify'
  | 'database'
  | 'websocket'
  | 'tcp'
  | 'udp';
export type FrontendOption = 'three' | 'gsap' | 'lenis';

export type ProjectConfig = {
  name: string;
  shape: ProjectShape;
  backend: BackendOption[];
  frontend: FrontendOption[];
};
