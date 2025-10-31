import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { HttpExceptionFilter } from '../shared/exception-service';
import { Public } from '../common/decorators/public.decorator';
import { DeleteUserDto } from './dto/delete-user.dto';

@UseFilters(new HttpExceptionFilter('users'))
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get(':id')
  @Roles(Role.User)
  @UseGuards(JwtAuthGuard, RolesGuard)
  findOne(@Param('id') id: number) {
    return this.usersService.findOne(+id);
  }

  @Get()
  @Roles(Role.User)
  @UseGuards(JwtAuthGuard, RolesGuard)
  findAll(@Param('id') id: number) {
    return this.usersService.findAll();
  }

  @Patch(':id')
  @Roles(Role.User)
  @UseGuards(JwtAuthGuard, RolesGuard)
  update(@Param('id') id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @Roles(Role.User)
  @UseGuards(JwtAuthGuard, RolesGuard)
  remove(@Param('id') id: number,@Body() deleteUserDto: DeleteUserDto) {
    return this.usersService.remove(+id,deleteUserDto);
  }
}
