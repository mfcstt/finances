# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/413249d1-799c-4a6f-9bfc-76c47dbc0671

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/413249d1-799c-4a6f-9bfc-76c47dbc0671) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/413249d1-799c-4a6f-9bfc-76c47dbc0671) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

---

## Mobile / Responsividade ✅

- A barra lateral foi adaptada para telas pequenas: no desktop ela aparece à esquerda; em telas mobile há uma barra fixa na parte inferior com atalhos e um botão de menu para abrir o drawer com a navegação completa.
- O conteúdo principal adiciona um padding-bottom (`pb-20`) em telas pequenas para evitar que a barra inferior cubra conteúdo interativo.
- A tabela em `Transações` usa `overflow-x-auto` para permitir rolagem horizontal em telas estreitas.

Como testar:

1. Rode o projeto (npm run dev) e abra o DevTools do navegador (Ctrl+Shift+I) para alternar para um dispositivo móvel ou ajustar a largura da janela.
2. Verifique que a barra lateral some e aparece a barra inferior; abra o menu para ver a navegação completa.
3. Navegue até `Transações` e confirme que a tabela rola horizontalmente se necessário.
