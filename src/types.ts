export type BackendOption = 'database' | 'fastify' | 'tcp' | 'udp' | 'websocket'
export type FrontendOption = 'gsap' | 'lenis' | 'three'
export type ProjectConfig = {
  backend: BackendOption[]
  frontend: FrontendOption[]
  name: string
  shape: ProjectShape
}

export type ProjectShape = 'backend' | 'frontend' | 'turbo'
