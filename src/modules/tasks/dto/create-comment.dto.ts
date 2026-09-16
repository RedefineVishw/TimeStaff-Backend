import { ArrayMaxSize, IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCommentDto {
    @IsString()
    @IsNotEmpty({ message: 'Comment cannot be empty' })
    @MaxLength(2000)
    body!: string;

    // Set by the composer's @mention autocomplete (the selected users' ids),
    // not parsed out of `body` — the frontend is the source of truth for
    // who was actually tagged, since matching by name in free text is
    // ambiguous (two people can share a name) and fragile.
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(50)
    @IsUUID('4', { each: true, message: 'mentionedUserIds must contain valid user ids' })
    mentionedUserIds?: string[];
}
