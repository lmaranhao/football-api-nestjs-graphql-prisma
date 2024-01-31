import { ConfigService } from '@nestjs/config';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import axios from 'axios';
import { PrismaService } from 'src/prisma/prisma.service';
import { ImportLeagueResponse } from '../objects/importLeagueResponse.object';

@Resolver()
export class LeagueResolver {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  @Query(() => String)
  async teams() {
    console.log(await this.prisma.competition.findMany());
    return 'teams here';
  }

  @Mutation(() => ImportLeagueResponse)
  async importLeague(@Args('leagueCode') leagueCode: string) {
    const { id, name, code, areaName } =
      await this.fetchCompetition(leagueCode);

    const competitionToTeams = await this.prisma.competitionToTeam.findMany({
      where: { competitionId: id },
    });

    for (const competitionToTeam of competitionToTeams) {
      const otherAssociations = await this.prisma.competitionToTeam.count({
        where: { teamId: competitionToTeam.teamId, NOT: { competitionId: id } },
      });

      if (otherAssociations === 0) {
        await this.prisma.team.delete({
          where: { id: competitionToTeam.teamId },
        });
      }
    }

    const teamsData = (await this.fetchTeams(leagueCode)).map((team) => {
      return {
        team: {
          connectOrCreate: {
            where: {
              id: team.id,
            },
            create: {
              id: team.id,
              name: team.name,
              tla: team.tla,
              shortName: team.shortName,
              areaName: team.area.name,
              address: team.address,
              coach: {
                create: {
                  id: team.coach.id,
                  name: team.coach.name,
                  dateOfBirth: team.coach.dateOfBirth,
                  nationality: team.coach.nationality,
                },
              },
              players: {
                create: team.squad.map((player) => {
                  return {
                    id: player.id,
                    name: player.name,
                    dateOfBirth: player.dateOfBirth,
                    nationality: player.nationality,
                    position: player.position,
                  };
                }),
              },
            },
          },
        },
      };
    });

    await this.prisma.$transaction([
      this.prisma.competition.deleteMany({ where: { id } }),
      this.prisma.competition.create({
        data: {
          id,
          name,
          code,
          areaName,
          teams: { create: teamsData },
        },
      }),
    ]);

    return new ImportLeagueResponse('success');
  }

  async fetchCompetition(leagueCode: string) {
    const url = `https://api.football-data.org/v4/competitions/${leagueCode}`;
    const response = await axios.get(url, {
      headers: {
        'X-Auth-Token': this.config.get('FOOTBALL-API-TOKEN'),
      },
    });

    const data = response.data;
    const id = data.id;
    const name = data.name;
    const areaName = data.area.name;

    return { id, name, code: leagueCode, areaName };
  }

  async fetchTeams(leagueCode: string) {
    const url = `https://api.football-data.org/v4/competitions/${leagueCode}/teams`;
    const response = await axios.get(url, {
      headers: {
        'X-Auth-Token': this.config.get('FOOTBALL-API-TOKEN'),
      },
    });

    const data = response.data;

    return data.teams;
  }
}
