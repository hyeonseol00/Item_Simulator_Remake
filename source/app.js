import express from 'express';
import cookieParser from 'cookie-parser';
import dotEnv from "dotenv";
import errorHandlingMiddleware from './middlewares/error-handling.middleware.js';
import AccountsRouter from "./routes/accounts.router.js";
import CharactersRouter from "./routes/characters.router.js";
import ItemsRouter from "./routes/items.router.js";
import StoreRouter from "./routes/store.router.js";
import InventoryRouter from "./routes/inventory.routes.js";

dotEnv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());
app.use('/api', [AccountsRouter, CharactersRouter, ItemsRouter, StoreRouter, InventoryRouter]);
app.use(errorHandlingMiddleware);

app.listen(PORT, () =>
{
	console.log(PORT, '포트로 서버가 열렸어요!');
});