import { Field, ObjectType } from '@nestjs/graphql';
import { Team } from './team.object';

@ObjectType()
export class Player {
  @Field()
  name: string;

  @Field({ nullable: true })
  position: string;

  @Field({ nullable: true })
  dateOfBirth: string;

  @Field({ nullable: true })
  nationality: string;

  @Field((type) => [Team], { nullable: true })
  teams: Team[];
}
