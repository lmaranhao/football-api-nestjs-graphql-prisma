import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FootballApiService } from 'src/footballApiClient/footballApi.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ImportLeagueResponse } from '../objects/importLeagueResponse.object';
import { TeamResponse } from '../objects/teamResponse.object';
import { Coach } from '../objects/coach.object';
import { Player } from '../objects/player.object';
import { Team } from '../objects/team.object';

@Resolver()
export class GraphqlApiResolver {
  constructor(
    private prisma: PrismaService,
    private footballApiService: FootballApiService,
  ) {}

  @Query(() => TeamResponse)
  async teams(@Args('teamName') teamName: string) {
    const teamFromDb = await this.prisma.team.findUnique({
      where: {
        name: teamName,
      },
      include: {
        coach: true,
        players: { include: { player: true } },
      },
    });
    const response = new TeamResponse();
    response.name = teamFromDb.name;
    response.coach = new Coach();
    if (teamFromDb.coach !== null) {
      response.coach.name = teamFromDb.coach.name;
      response.coach.dateOfBirth = teamFromDb.coach.dateOfBirth;
      response.coach.nationality = teamFromDb.coach.nationality;
    } else {
      response.coach.name = 'n/a';
      response.coach.nationality = 'n/a';
      response.coach.nationality = 'n/a';
    }
    response.players = [];
    if (teamFromDb.players?.length > 0) {
      response.players = teamFromDb.players.map((player) => {
        const playerObject = new Player();
        playerObject.name = player.player.name;
        playerObject.dateOfBirth = player.player.dateOfBirth;
        playerObject.nationality = player.player.nationality;
        playerObject.position = player.player.position;
        return playerObject;
      });
    }
    return response;
  }

  @Query(() => [Player])
  async players(
    @Args('leagueCode') leagueCode: string,
    @Args('teamFilter', { nullable: true }) teamFilter?: string,
  ) {
    const playersFromDb = await this.prisma.player.findMany({
      where: {
        teams: {
          every: {
            team: {
              AND: [
                {
                  competitions: {
                    every: { competition: { code: leagueCode } },
                  },
                },
                { name: teamFilter },
              ],
            },
          },
        },
      },
      include: {
        teams: { include: { team: true } },
      },
    });

    const players: Player[] = [];
    for (const playerFromDB of playersFromDb) {
      const player = new Player();
      Object.assign(player, playerFromDB);
      const teams: Team[] = playerFromDB.teams.map((teamFromDb) => {
        const team: Team = new Team();
        Object.assign(team, teamFromDb.team);
        return team;
      });
      player.teams = teams;
      players.push(player);
    }

    return players;
  }

  @Mutation(() => ImportLeagueResponse)
  async importLeague(@Args('leagueCode') leagueCode: string) {
    const status: string =
      await this.footballApiService.importLeague(leagueCode);
    return new ImportLeagueResponse(status);
  }
}
