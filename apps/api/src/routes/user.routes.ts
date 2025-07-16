import { RouteGroup } from '../core';
import { UserController, createUserSchema, updateUserSchema, userIdSchema, listUsersSchema } from '../controllers/user.controller';

export function createUserRoutes(controller: UserController): RouteGroup {
  return {
    prefix: '/users',
    description: 'User management endpoints',
    routes: [
      {
        method: 'get',
        path: '/',
        handler: controller.listUsers,
        validation: {
          query: listUsersSchema,
        },
        description: 'List all users with pagination and filtering',
        tags: ['users'],
      },
      {
        method: 'get',
        path: '/:id',
        handler: controller.getUser,
        validation: {
          params: userIdSchema,
        },
        description: 'Get a specific user by ID',
        tags: ['users'],
      },
      {
        method: 'post',
        path: '/',
        handler: controller.createUser,
        validation: {
          body: createUserSchema,
        },
        description: 'Create a new user',
        tags: ['users'],
      },
      {
        method: 'patch',
        path: '/:id',
        handler: controller.updateUser,
        validation: {
          params: userIdSchema,
          body: updateUserSchema,
        },
        description: 'Update an existing user',
        tags: ['users'],
      },
      {
        method: 'delete',
        path: '/:id',
        handler: controller.deleteUser,
        validation: {
          params: userIdSchema,
        },
        description: 'Delete a user',
        tags: ['users'],
      },
    ],
  };
}