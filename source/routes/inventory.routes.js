import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/** 캐릭터 인벤토리 조회 API **/
router.get('/character/:characterId/inventory', authMiddleware, async (req, res, next) =>
{
	const { id } = req.account;
	const { characterId } = req.params;
	const character = await prisma.characters.findFirst({ where: { id: +characterId } });

	if (!character)
		return res.status(404).json({ errorMessage: '존재하지 않는 캐릭터입니다.' });
	else if (id != character.accountId)
		return res.status(403).json({ errorMessage: '다른 계정의 캐릭터는 조회할 수 없습니다!' });

	const inventory = await prisma.inventory.findMany({
		where: {
			characterId: +characterId,
		},
	});

	let result = [];

	const promises = inventory.map(async ele =>
	{
		const item = await prisma.items.findFirst({ where: { id: +ele.ownItem } });

		result.push({
			itemId: ele.ownItem,
			itemName: item.name,
			count: ele.count,
		});
	});

	await Promise.all(promises);

	return res.status(201).json(result);
});

/** 캐릭터 장착한 아이템 조회 API **/
router.get('/character/:characterId/equip', async (req, res, next) =>
{
	const { characterId } = req.params;
	const character = await prisma.characters.findFirst({ where: { id: +characterId } });

	if (!character)
		return res.status(404).json({ errorMessage: '존재하지 않는 캐릭터입니다.' });

	const equip = await prisma.equip.findMany({
		where: {
			characterId: +characterId,
		},
	});

	let result = [];

	const promises = equip.map(async ele =>
	{
		const item = await prisma.items.findFirst({ where: { id: +ele.ownItem } });

		result.push({
			itemId: ele.ownItem,
			itemName: item.name,
			count: ele.count,
		});
	});

	await Promise.all(promises);

	return res.status(201).json(result);
});

export default router;