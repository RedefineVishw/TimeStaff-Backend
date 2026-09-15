import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { TaskCommentsService } from './task-comments.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { AssignTaskDto } from './dto/assign-task.dto.js';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/types/current-user.type.js';
import { SuccessMessage } from '../../common/decorators/success-message.decorator.js';

// No single base path — routes span /projects/:id/tasks (create/list,
// nested under the owning project), /tasks/:id (everything else, since a
// task is addressed by its own id from there on), and /comments/:id (a
// comment's own id, once posted).
@Controller()
@UseGuards(JwtAuthGuard)
export class TasksController {
    constructor(
        private readonly tasksService: TasksService,
        private readonly taskCommentsService: TaskCommentsService,
    ) { }

    @Post('projects/:id/tasks')
    @SuccessMessage('Task created.')
    create(@CurrentUser() user: CurrentUserPayload, @Param('id') projectId: string, @Body() dto: CreateTaskDto) {
        return this.tasksService.create(user, projectId, dto);
    }

    @Get('projects/:id/tasks')
    @SuccessMessage('Tasks retrieved.')
    findAllForProject(@CurrentUser() user: CurrentUserPayload, @Param('id') projectId: string) {
        return this.tasksService.findAllForProject(user, projectId);
    }

    @Get('tasks/:id')
    @SuccessMessage('Task retrieved.')
    findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
        return this.tasksService.findOne(user, id);
    }

    @Patch('tasks/:id')
    @SuccessMessage('Task updated.')
    update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
        return this.tasksService.update(user, id, dto);
    }

    @Delete('tasks/:id')
    @SuccessMessage('Task deleted.')
    remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
        return this.tasksService.remove(user, id);
    }

    @Patch('tasks/:id/assign')
    @SuccessMessage('Task assignee updated.')
    assign(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: AssignTaskDto) {
        return this.tasksService.assign(user, id, dto);
    }

    @Patch('tasks/:id/status')
    @SuccessMessage('Task status updated.')
    updateStatus(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateTaskStatusDto) {
        return this.tasksService.updateStatus(user, id, dto);
    }

    @Get('tasks/:id/comments')
    @SuccessMessage('Comments retrieved.')
    findComments(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
        return this.taskCommentsService.findAll(user, id);
    }

    @Post('tasks/:id/comments')
    @SuccessMessage('Comment posted.')
    createComment(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: CreateCommentDto) {
        return this.taskCommentsService.create(user, id, dto);
    }

    @Delete('comments/:id')
    @SuccessMessage('Comment deleted.')
    removeComment(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
        return this.taskCommentsService.remove(user, id);
    }
}
