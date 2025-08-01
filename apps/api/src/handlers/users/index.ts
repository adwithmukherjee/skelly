import { createUserHandler } from './createUser';
import { deleteUserHandler } from './deleteUser';
import { UserControllerDeps } from './deps';
import { getUserHandler } from './getUser';
import { listUsersHandler } from './listUsers';
import { updateUserHandler } from './updateUser';

export function createUserHandlers(deps: UserControllerDeps) {
  return {
    listUsers: listUsersHandler(deps),
    getUser: getUserHandler(deps),
    createUser: createUserHandler(deps),
    updateUser: updateUserHandler(deps),
    deleteUser: deleteUserHandler(deps),
  };
}

export type { UserControllerDeps };

// Re-export schemas and types for convenience
export * from './listUsers';
export * from './getUser';
export * from './createUser';
export * from './updateUser';
export * from './deleteUser';
