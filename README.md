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

## � TanStack Query & Data Hooks

This project uses [TanStack Query (React Query)](https://tanstack.com/query/latest) for efficient data fetching, caching, and synchronization. Data is managed using hooks:

- `useQuery` for fetching and caching data (e.g., client lists)
- `useMutation` for updating or creating data (e.g., adding a client)

Example usage:

```tsx
const { data, isLoading, isError } = useQuery({
  queryKey: ["clients"],
  queryFn: fetchClients,
});

const mutation = useMutation({
  mutationFn: addClient,
});
```

Queries and mutations automatically update the UI and keep data in sync with the server.

## 💅 Styling

Styling is managed globally using [Tailwind CSS](https://tailwindcss.com/) and custom variables in [`src/app/globals.css`](src/app/globals.css). This file defines color schemes, spacing, and theming for both light and dark modes. Use Tailwind utility classes in your components for layout and appearance.

## 🧩 shadcn/ui

[shadcn/ui](https://ui.shadcn.com/) is used for modern, accessible UI components such as buttons, dropdowns, inputs, and tables. These components are styled with Tailwind and provide a consistent look and feel across the app.

## �🗨️ Contact

If you have any inquiries about the development of this project, you can reach the Hack4Impact McGill chapter at:

- **Email**: hack4impact@ssmu.ca
