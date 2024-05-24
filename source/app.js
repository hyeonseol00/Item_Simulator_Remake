import express from 'express';
import cookieParser from 'cookie-parser';
import expressSession from "express-session";
import dotEnv from "dotenv";
import expressMySQLSession from "express-mysql-session";
import errorHandlingMiddleware from './middlewares/error-handling.middleware';
import AccountsRouter from "./routes/accounts.router";

dotEnv.config();

const app = express();
const PORT = 3000;

const MySQLStore = expressMySQLSession(expressSession);
const sessionStore = new MySQLStore({
	user: process.env.DATABASE_USERNAME,
	password: process.env.DATABASE_PASSWORD,
	host: process.env.DATABASE_HOST,
	port: process.env.DATABASE_PORT,
	database: process.env.DATABASE_NAME,
	expiration: 1000 * 60 * 60 * 1,
	createDatabaseTable: true,
});

app.use(express.json());
app.use(cookieParser());
app.use(expressSession(
	{
		secret: process.env.SESSION_SECRET_KEY,
		resave: false,
		saveUninitialized: false,
		store: sessionStore,
		cookie: {
			maxAge: 1000 * 60 * 60 * 1,
		},
	}
));
app.use('/api', [AccountsRouter]);
app.use(errorHandlingMiddleware);

app.listen(PORT, () =>
{
	console.log(PORT, '포트로 서버가 열렸어요!');
});