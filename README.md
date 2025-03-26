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

When you're assigned a ticket, create a branch to your work on, and push your code there. Once you've finished your ticket, create a pull request and assign a tech lead to review it. Prettier will automatically format your code when you create your PR.

## 🧗 Setting Up

Create a file called `.env` in the root of the project. Copy the file from Notion.

Finally, run `npx prisma db push` to match your database with the prisma schema.

Now you should be all ready to run the project!

## Styling

This project uses both Material UI and Tailwind CSS.

### Applying custom styling

1. Use Material UI to import specific components.
2. Use Tailwind CSS utility classes to apply custom styling.
3. Apply global theme changes (ex. colors, font size) inside of `sharedTheme.ts` if you need them to apply to both MUI components/app overall.
4. Ensure that these changes are also updated inside of `styles/theme.ts` and `tailwind.config.ts` if applicable.

## 🗨️ Contact

If you have any inquiries about the development of this project, you can reach the Hack4Impact McGill chapter at:

- **Email**: hack4impact@ssmu.ca
