# Book Shop

This project is arranged as a simple frontend plus a Node.js backend starter.

## Run The Frontend Only

Open `home.html` in your browser.

## Connect MySQL

1. Install Node.js and MySQL.
2. Create a real `.env` file by copying `.env.example`.
3. Import `database.sql` into MySQL.
4. Install dependencies:

```bash
npm install
```

5. Start the server:

```bash
npm start
```

The app will be available at `http://localhost:3000/home.html`.

## Important Files

- `home.js` controls `home.html`.
- `login.js` controls `login.html`.
- `signup.js` controls `signup.html`.
- `user.js` controls `user.html`.
- `admin.js` controls `admin.html`.
- `server.js` contains the backend API.
- `src/db.js` contains the MySQL connection.
- `database.sql` creates the database tables.
