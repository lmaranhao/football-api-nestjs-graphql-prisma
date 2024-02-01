import { Field, ObjectType } from '@nestjs/graphql';
import { Coach } from './coach.object';
import { Player } from './player.object';


@ObjectType()
export class TeamResponse {

  @Field()
  name: string;

  @Field(type => Coach)
  coach: Coach;

  @Field(type => [Player])
  players: Player[];
}
