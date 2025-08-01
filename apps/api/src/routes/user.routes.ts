import { RouteGroup } from '../core';
import { createUserHandlers, UserControllerDeps } from '../handlers/users';

export function createUserRoutes(deps: UserControllerDeps): RouteGroup {
  const handlers = createUserHandlers(deps);

  return {
    prefix: '/users',
    description: 'User management endpoints',
    routes: [
      {
        method: 'get',
        path: '/',
        handler: handlers.listUsers,
        description: 'List all users with pagination and filtering',
        tags: ['users'],
      },
      {
        method: 'get',
        path: '/:id',
        handler: handlers.getUser,
        description: 'Get a specific user by ID',
        tags: ['users'],
      },
      {
        method: 'post',
        path: '/',
        handler: handlers.createUser,
        description: 'Create a new user',
        tags: ['users'],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: handlers.updateUser,
        description: 'Update an existing user',
        tags: ['users'],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: handlers.deleteUser,
        description: 'Delete a user',
        tags: ['users'],
      },
    ],
  };
}
