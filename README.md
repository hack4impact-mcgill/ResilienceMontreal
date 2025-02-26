# Resilience MTL

## 📝 How to Run

See the setup instructions below. Once you have docker and postgres set up, run the project with:

```bash
# clone the repository
git clone https://github.com/hack4impact-mcgill/ResilienceMontreal

# navigate to the project directory
cd ResilienceMontreal

# install dependencies
npm i

# start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## ⚒️ Contributing

When you're assigned a ticket, create a branch to your work on, and push your code there. Once you've finished your ticket, create a pull request and assign a tech lead to review it. Make sure to run `npx prettier --write` to format your code before creating your PR.

## 🧗 Setting Up

If you don't already have them, install [Docker Engine](https://docs.docker.com/engine/install/) or [Docker Desktop](https://www.docker.com/products/docker-desktop/) and [PostgresQL](https://www.postgresql.org/download/).

Create a docker container for the database, replacing PASSWORD with a password of your choice:

```bash
docker run -d --name resilience-postgres -e POSTGRES_USER="postgres" -e POSTGRES_PASSWORD="PASSWORD" -e POSTGRES_DB=resilience -p 12345:5432 docker.io/postgres
```

Create a file called `.env` in the root of the project, and copy the following into it, replacing `PASSWORD` with the one you chose above:

```
# copy the contents of this file to a .env file in the root of the project
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:12345/resilience?schema=public"
```

Then you can access the database using:

```bash
psql --username postgres -p 12345
```

Finally, run `npx prisma db push` to match your database with the prisma schema.

Now you should be all ready to run the project!

## 🗨️ Contact

If you have any inquiries about the development of this project, you can reach the Hack4Impact McGill chapter at:

- **Email**: hack4impact@ssmu.ca
