## Description

This is a pet project I did using [NestJS](https://nestjs.com/), [Prisma](https://www.prisma.io/), and the [football-data](https://www.football-data.org/) API.

## Installation

```bash
# if you use nvm - to make sue you are using the same node version I used to code this
$ nvm use

# install dependencies
$ yarn install

# create/install the postgres docker locally
$ yarn db:dev:up

# rename the.env.sample file to .env and change its contents to what I send you in the email
DATABASE_URL="postgresql://postgres:123@localhost:5434/santex?schema=public" # this is how my docker-compose file configures local postgres
FOOTBALL-API-TOKEN="USE YOUR API TOKEN HERE"

# run db migrations
$ npx prisma migrate deploy

```

## Running the app

```bash
# run app in development
$ yarn run start

# run app in watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Access the GraphQL playground
Go to http://localhost:3000/graphql to access the GraphlQL playground.
There you will have 2 queries and 1 mutation.

ImportLeague endpoint sample
```
mutation ImportLeague($leagueCode: String!) {
  importLeague(leagueCode: $leagueCode) {
    status
  }
}
```

Teams endpoint sample
```
query Teams($teamName: String!) {
  teams(teamName: $teamName) {
    name,
    coach {
      name,
      nationality,
      dateOfBirth,
      team {
        address
      }
    },
    players {
      name,
      dateOfBirth,
      position
    }
  }
}
```

Players endpoint sample
```
query Players($leagueCode: String!, $teamFilter: String) {
  players(leagueCode: $leagueCode, teamFilter: $teamFilter) {
    name
    dateOfBirth
    nationality
    position
    teams {
      name
    }
  }
}
```