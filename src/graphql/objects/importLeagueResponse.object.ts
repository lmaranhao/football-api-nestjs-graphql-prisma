import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ImportLeagueResponse {

  constructor(status: string) {
    this.status = status;
  }
  @Field()
  status: string;
}
