import { UserService } from '../../services/user.service';

export interface UserControllerDeps {
  userService: UserService;
}
