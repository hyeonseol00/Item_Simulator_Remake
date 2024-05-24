import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/** 캐릭터 생성 API **/
router.post('/character', authMiddleware, async (req, res, next) =>
{
	const { id } = req.account;
	const { name } = req.body;

	const isExistCharacter = await prisma.characters.findFirst({
		where: {
			name,
		},
	});

	if (isExistCharacter)
		return res.status(409).json({ message: '중복된 이름입니다.' });

	const character = await prisma.characters.create({
		data: {
			accountId: +id,
			name,
			health: 500,
			power: 100,
			money: 10000
		},
	});

	return res.status(201).json({ name: character["name"] });
});

/** 캐릭터 삭제 API **/
router.delete('/character', authMiddleware, async (req, res, next) =>
{
	const { id } = req.account;
	const { name } = req.body;
	const character = await prisma.characters.findFirst({ where: { name } });

	if (!character)
		return res.status(404).json({ errorMessage: '존재하지 않는 캐릭터입니다.' });
	else if (id != character.accountId)
		return res.status(400).json({ errorMessage: '다른 계정의 캐릭터는 삭제할 수 없습니다!' });

	await prisma.characters.delete({ where: { name } });

	return res.status(200).json({ message: "캐릭터 삭제 완료" });
});

/** 캐릭터 상세 조회 API **/
router.get('/character', authMiddleware, async (req, res, next) =>
{
	const { id } = req.account;
	const { name } = req.body;
	const character = await prisma.characters.findFirst({ where: { name } });

	if (!character)
		return res.status(404).json({ errorMessage: '존재하지 않는 캐릭터입니다.' });

	let message;
	if (id == character.accountId)
		message = {
			name: character.name,
			health: character.health,
			power: character.power,
			money: character.money
		};
	else
		message = {
			name: character.name,
			health: character.health,
			power: character.power
		};

	return res.status(200).json({ message });
});


export default router;