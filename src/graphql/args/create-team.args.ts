import { ArgsType } from '@nestjs/graphql';

@ArgsType()
export class CreateTeamArgs {
  name: String;
}
