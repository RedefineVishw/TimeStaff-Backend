import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProjectAccessService } from '../projects/project-access.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { AssignTaskDto } from './dto/assign-task.dto.js';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto.js';
import type { CurrentUserPayload } from '../../common/types/current-user.type.js';

const ORG_ADMIN_ROLE_NAME = 'ORGANIZATION_ADMIN';
const MAX_DEPTH = 2; // three levels total: 0, 1, 2

@Injectable()
export class TasksService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
        private readonly notifications: NotificationsService,
    ) { }

    async create(user: CurrentUserPayload, projectId: string, dto: CreateTaskDto) {
        await this.access.assertPermission(user, projectId, 'task.create');

        let depth = 0;
        if (dto.parentId) {
            const parent = await this.prisma.task.findUnique({ where: { id: dto.parentId } });
            if (!parent || parent.projectId !== projectId) {
                throw new BadRequestException('parentId does not match a task in this project');
            }
            if (parent.depth >= MAX_DEPTH) {
                throw new BadRequestException('Maximum subtask depth reached (3 levels)');
            }
            // A task with its own time estimate is an atomic unit of work —
            // mutually exclusive with having subtasks (see update() for the
            // reverse direction of this same rule).
            if (parent.estimatedMinutes !== null) {
                throw new BadRequestException(
                    'This task has an estimated time set and is meant to be a single unit of work — remove the estimate before adding subtasks',
                );
            }
            depth = parent.depth + 1;
        }

        if (dto.assigneeId) {
            await this.assertAssignable(user, projectId, dto.assigneeId);
        }

        const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
        const dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;

        // A brand-new task can't be backdated — its range has to start no
        // earlier than the day it's actually being created on.
        const today = this.toUTCDay(new Date());
        if (startDate && startDate < today) {
            throw new BadRequestException(`Start date can't be earlier than today (${this.formatDay(today)})`);
        }
        if (dueDate && dueDate < today) {
            throw new BadRequestException(`Due date can't be earlier than today (${this.formatDay(today)})`);
        }
        this.assertDateRangeValid(startDate, dueDate);

        const task = await this.prisma.task.create({
            data: {
                projectId,
                parentId: dto.parentId,
                depth,
                title: dto.title,
                description: dto.description,
                priority: dto.priority,
                assigneeId: dto.assigneeId,
                startDate,
                dueDate,
                estimatedMinutes: dto.estimatedMinutes,
                createdBy: user.id,
                updatedBy: user.id,
            },
        });

        // Always notify — including yourself. A creator's own inbox should
        // reflect their own actions too (an activity record, not only an
        // alert about someone else's action), and an assignee should always
        // hear about it even when they assigned it to themselves.
        await this.notifications.create({
            userId: user.id,
            type: 'TASK_CREATED',
            title: `You created: ${task.title}`,
            entityType: 'Task',
            entityId: task.id,
        });

        if (dto.assigneeId && dto.assigneeId !== user.id) {
            await this.notifications.create({
                userId: dto.assigneeId,
                type: 'TASK_ASSIGNED',
                title: `You were assigned: ${task.title}`,
                entityType: 'Task',
                entityId: task.id,
            });
        }

        return task;
    }

    async findAllForProject(user: CurrentUserPayload, projectId: string) {
        await this.access.assertAccess(user, projectId);
        const scope = await this.access.getTaskVisibilityScope(user, projectId);

        // Top-level tasks with two levels of nested subtasks included —
        // matches the 3-level max, so the full tree comes back in one call.
        // Visibility is only filtered at the top level here — a subtask
        // inherits its parent's visibility rather than being filtered
        // independently, since it's a checklist item within a task you
        // already have access to, not a standalone task on the board.
        return this.prisma.task.findMany({
            where: { projectId, parentId: null, ...this.visibilityWhere(scope, user.id) },
            include: { subtasks: { include: { subtasks: true } } },
            orderBy: { createdAt: 'asc' },
        });
    }

    async findOne(user: CurrentUserPayload, id: string) {
        const task = await this.getTaskOrThrow(id);
        await this.access.assertAccess(user, task.projectId);
        await this.assertVisible(user, task);
        return this.prisma.task.findUnique({
            where: { id },
            include: { subtasks: { include: { subtasks: true } }, parent: true },
        });
    }

    async update(user: CurrentUserPayload, id: string, dto: UpdateTaskDto) {
        const task = await this.getTaskOrThrow(id);
        await this.access.assertPermission(user, task.projectId, 'task.edit');

        if (dto.estimatedMinutes !== undefined) {
            const subtaskCount = await this.prisma.task.count({ where: { parentId: id } });
            if (subtaskCount > 0) {
                throw new BadRequestException(
                    'This task has subtasks — it can\'t also have its own time estimate. Set estimates on the subtasks instead.',
                );
            }
        }

        // A partial update only sends the side of the range that changed —
        // validate against whichever value (new or already-persisted) ends
        // up on each side, not just the one(s) present in this request.
        const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
        const dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;
        const effectiveStartDate = startDate ?? task.startDate;
        const effectiveDueDate = dueDate ?? task.dueDate;

        // The range can be pushed later at any time, but never dragged
        // earlier than the day the task was actually created — "created on
        // the 15th" can't retroactively be given a start date on the 14th.
        if (startDate) {
            const createdDay = this.toUTCDay(task.createdAt);
            if (startDate < createdDay) {
                throw new BadRequestException(
                    `Start date can't be earlier than when this task was created (${this.formatDay(createdDay)})`,
                );
            }
        }

        // Once time has actually been tracked against this task, the range
        // can never shrink to exclude a day that already has logged time on
        // it — it can only ever grow to keep covering that span.
        if (startDate !== undefined || dueDate !== undefined) {
            const trackedSpan = await this.getTrackedDateSpan(id);
            if (trackedSpan) {
                if (effectiveStartDate && effectiveStartDate > trackedSpan.earliest) {
                    throw new BadRequestException(
                        `Start date can't be moved past time already tracked on this task (earliest tracked: ${this.formatDay(trackedSpan.earliest)})`,
                    );
                }
                if (effectiveDueDate && effectiveDueDate < trackedSpan.latest) {
                    throw new BadRequestException(
                        `Due date can't be moved before time already tracked on this task (latest tracked: ${this.formatDay(trackedSpan.latest)})`,
                    );
                }
            }
        }

        this.assertDateRangeValid(effectiveStartDate, effectiveDueDate);

        return this.prisma.task.update({
            where: { id },
            data: {
                title: dto.title,
                description: dto.description,
                priority: dto.priority,
                startDate,
                dueDate,
                estimatedMinutes: dto.estimatedMinutes,
                updatedBy: user.id,
            },
        });
    }

    private assertDateRangeValid(startDate: Date | null | undefined, dueDate: Date | null | undefined) {
        if (startDate && dueDate && startDate > dueDate) {
            throw new BadRequestException('Start date must be on or before the due date');
        }
    }

    // Dates are stored as UTC midnight of the picked calendar day (see
    // create()/update()) — truncating any other Date (e.g. createdAt, a
    // TimeEntry timestamp) to its UTC calendar day puts it on the same
    // footing for comparison, regardless of what time of day it actually is.
    private toUTCDay(d: Date): Date {
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }

    private formatDay(d: Date): string {
        return d.toISOString().slice(0, 10);
    }

    // The full span of calendar days this task already has tracked time on
    // — null if nothing's been tracked yet. Used to stop the due-date range
    // from shrinking to exclude time that's already logged.
    private async getTrackedDateSpan(taskId: string): Promise<{ earliest: Date; latest: Date } | null> {
        const agg = await this.prisma.timeEntry.aggregate({
            where: { taskId },
            _min: { startedAt: true },
            _max: { startedAt: true, endedAt: true },
        });
        if (!agg._min.startedAt) return null;

        const latestRaw =
            agg._max.endedAt && agg._max.startedAt && agg._max.endedAt > agg._max.startedAt
                ? agg._max.endedAt
                : agg._max.startedAt!;

        return { earliest: this.toUTCDay(agg._min.startedAt), latest: this.toUTCDay(latestRaw) };
    }

    async remove(user: CurrentUserPayload, id: string) {
        const task = await this.getTaskOrThrow(id);
        await this.access.assertPermission(user, task.projectId, 'task.delete');

        const subtaskCount = await this.prisma.task.count({ where: { parentId: id } });
        if (subtaskCount > 0) {
            throw new BadRequestException('Delete or reassign this task\'s subtasks first');
        }

        await this.prisma.task.delete({ where: { id } });
        return { id };
    }

    async assign(user: CurrentUserPayload, id: string, dto: AssignTaskDto) {
        const task = await this.getTaskOrThrow(id);
        await this.access.assertPermission(user, task.projectId, 'task.assign');

        // The assignee is only up for grabs while the task is still To Do —
        // once work has actually started (or moved further), reassigning or
        // unassigning it out from under whoever's on it would just lose
        // accountability for what's already in progress.
        if (task.status !== 'TODO') {
            throw new BadRequestException(
                'This task can only be reassigned while it\'s still To Do — move it back to To Do first if it needs a new assignee',
            );
        }

        if (dto.assigneeId) {
            await this.assertAssignable(user, task.projectId, dto.assigneeId);
        }

        const updated = await this.prisma.task.update({
            where: { id },
            data: { assigneeId: dto.assigneeId ?? null, updatedBy: user.id },
        });

        // Notify even on self-assignment — see the note in create() above.
        if (dto.assigneeId) {
            await this.notifications.create({
                userId: dto.assigneeId,
                type: 'TASK_ASSIGNED',
                title: `You were assigned: ${task.title}`,
                entityType: 'Task',
                entityId: task.id,
            });
        }

        return updated;
    }

    async updateStatus(user: CurrentUserPayload, id: string, dto: UpdateTaskStatusDto) {
        const task = await this.getTaskOrThrow(id);
        await this.access.assertPermission(user, task.projectId, 'task.status.change');

        const updated = await this.prisma.task.update({
            where: { id },
            data: { status: dto.status, updatedBy: user.id },
        });

        // Notify the assignee (if someone else changed it) and the creator
        // (if they're not the one who changed it and not already notified
        // as the assignee) — the most common case is the assignee moving
        // their own task, which previously notified no one at all since it
        // only ever considered the assignee.
        const notifyIds = new Set<string>();
        if (task.assigneeId && task.assigneeId !== user.id) {
            notifyIds.add(task.assigneeId);
        }
        if (task.createdBy !== user.id) {
            notifyIds.add(task.createdBy);
        }

        for (const userId of notifyIds) {
            await this.notifications.create({
                userId,
                type: 'TASK_STATUS_CHANGED',
                title: `Task status changed to ${dto.status}: ${task.title}`,
                entityType: 'Task',
                entityId: task.id,
            });
        }

        return updated;
    }

    private async getTaskOrThrow(id: string) {
        const task = await this.prisma.task.findUnique({ where: { id } });
        if (!task) {
            throw new NotFoundException('Task not found');
        }
        return task;
    }

    // Prisma `where` fragment matching a visibility scope — used to filter
    // the task list. OWN/TEAM always also include tasks the user created
    // themselves, even if unassigned or assigned elsewhere, so they don't
    // lose sight of their own work.
    private visibilityWhere(scope: Awaited<ReturnType<ProjectAccessService['getTaskVisibilityScope']>>, userId: string) {
        if (scope.kind === 'ALL') {
            return {};
        }
        if (scope.kind === 'TEAM') {
            return { OR: [{ assigneeId: { in: [...scope.userIds] } }, { createdBy: userId }] };
        }
        return { OR: [{ assigneeId: userId }, { createdBy: userId }] };
    }

    // Same rule as visibilityWhere, applied to a single already-fetched task
    // — closes the gap where someone could bypass list filtering by
    // guessing/opening a task's URL directly.
    private async assertVisible(user: CurrentUserPayload, task: { assigneeId: string | null; createdBy: string; projectId: string }) {
        const scope = await this.access.getTaskVisibilityScope(user, task.projectId);
        if (scope.kind === 'ALL') return;
        if (task.createdBy === user.id) return;
        if (scope.kind === 'TEAM' && task.assigneeId && scope.userIds.has(task.assigneeId)) return;
        if (scope.kind === 'OWN' && task.assigneeId === user.id) return;
        throw new ForbiddenException('You do not have access to this task');
    }

    // An assignee must actually have access to the project — a project
    // member, or the org admin (who always has access without a row) —
    // and the assigner must have authority to assign to them (team leads
    // are restricted to their own led teams; see ProjectAccessService.canAssign).
    private async assertAssignable(user: CurrentUserPayload, projectId: string, assigneeId: string) {
        const assignee = await this.prisma.user.findUnique({
            where: { id: assigneeId },
            include: { role: true },
        });
        if (!assignee || assignee.organizationId !== user.organizationId) {
            throw new BadRequestException('assigneeId does not belong to your organization');
        }
        if (assignee.role?.name !== ORG_ADMIN_ROLE_NAME) {
            const membership = await this.access.getMembership(assigneeId, projectId);
            if (!membership) {
                throw new BadRequestException('assigneeId is not a member of this project');
            }
        }

        const allowed = await this.access.canAssign(user, projectId, assigneeId);
        if (!allowed) {
            throw new ForbiddenException('You can only assign tasks to yourself or members of a team you lead');
        }
    }
}
