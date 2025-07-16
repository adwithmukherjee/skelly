/**
 * Service interfaces for dependency injection
 */

// Database health check function type
export type DatabaseHealthCheck = () => Promise<boolean>;

// Add more service types as needed