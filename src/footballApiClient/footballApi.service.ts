import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FootballApiService {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async importLeague(leagueCode: string): Promise<string> {
    return this.prisma.$transaction(
      async (tx) => {
        //fetches competition data from football api
        const { id, name, code, areaName } =
          await this.fetchCompetition(leagueCode);

        // the manytomany relation between competition - team needs some
        // clean up before we can save new data
        // we need to remove all relations to existing teams 
        // and remove old competition data
        const competitionToTeams = await tx.competitionToTeam.findMany({
          where: { competitionId: id },
        });
        
        for (const competitionToTeam of competitionToTeams) {
          const otherAssociations = await tx.competitionToTeam.count({
            where: {
              teamId: competitionToTeam.teamId,
              NOT: { competitionId: id },
            },
          });

          if (otherAssociations === 0) {
            await tx.team.delete({
              where: { id: competitionToTeam.teamId },
            });
          }
        }

        // delete old competition
        await tx.competition.deleteMany({ where: { id } });

        const teamsFetched = await this.fetchTeams(leagueCode);

        // creates the team data to be used with prisma ORM
        const teamsData = teamsFetched.map((team) => {
          
          let teamData = {
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
                },
              },
            },
          };

          if(team.coach.id !== null) {
            teamData.team.connectOrCreate.create['coach'] = {
              create: {
                id: team.coach.id,
                name: team.coach.name,
                dateOfBirth: team.coach.dateOfBirth,
                nationality: team.coach.nationality,
              },
            }
          }
          return teamData;
        });

        // creates the competition data to be used with prisma ORM
        const createCompetitionData = {
          data: {
            id,
            name,
            code,
            areaName,
            teams: { create: teamsData },
          },
        };

        // inserts new competition 
        await tx.competition.create(createCompetitionData);

        // teams - player relation is many to many and not one to many 
        // this brings more complexity to the code

        // we need to first clean up the team - players relation
        // and delete old team data
        for (const team of teamsFetched) {
          const teamToPlayers = await tx.teamToPlayer.findMany({
            where: { teamId: team.id },
          });

          for (const teamToPlayer of teamToPlayers) {
            const otherAssociations = await tx.teamToPlayer.count({
              where: {
                teamId: teamToPlayer.teamId,
                NOT: { teamId: team.id },
              },
            });

            if (otherAssociations === 0) {
              await tx.player.deleteMany({
                where: { id: teamToPlayer.teamId },
              });
            }
          }
          await tx.team.deleteMany({ where: { id } });
        }

        // this flat array is to help is create the players and the
        // relations with their teams
        // again - same player can me in more than 1 team (???)
        // hence the many to many relation 
        const createPlayersFlat = teamsFetched
          .map((team) =>
            team.squad.map((player) => {
              return {
                id: player.id,
                name: player.name,
                nationality: player.nationality,
                position: player.position,
                dateOfBirth: player.dateOfBirth,
                teamId: team.id,
              };
            }),
          )
          .flat();

        // creates new player and their relations with their teams
        for (const player of createPlayersFlat) {
          const playerFromDb = await tx.player.findMany({
            where: {
              id: player.id,
            },
          });
          if (playerFromDb.length === 0) {
            await tx.player.create({
              data: {
                id: player.id,
                name: player.name,
                nationality: player.nationality,
                position: player.position,
                dateOfBirth: player.dateOfBirth
              },
            });
          }

          await tx.teamToPlayer.create({
            data: { playerId: player.id, teamId: player.teamId },
          });
        }

        // returns success if everything goes as expected
        return 'success';
      },
      {
        timeout: 100000, // needed to increase the default 5000
      },
    );
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
}
