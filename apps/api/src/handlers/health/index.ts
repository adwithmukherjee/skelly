import { HealthControllerDeps } from './deps';
import { createCheckHealthHandler } from './checkHealth';
import { createCheckReadinessHandler } from './checkReadiness';
import { createCheckLivenessHandler } from './checkLiveness';

export function createHealthHandlers(deps: HealthControllerDeps) {
  return {
    checkHealth: createCheckHealthHandler(deps),
    checkReadiness: createCheckReadinessHandler(deps),
    checkLiveness: createCheckLivenessHandler(deps),
  };
}

// Re-export for convenience
export * from './deps';
export * from './checkHealth';
export * from './checkReadiness';
export * from './checkLiveness';
