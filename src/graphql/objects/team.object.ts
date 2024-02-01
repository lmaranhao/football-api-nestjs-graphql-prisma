import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Team {
  @Field()
  name: string;

  @Field()
  tla: string;

  @Field()
  shortName: string;

  @Field()
  areaName: string;

  @Field()
  address: string;
}
