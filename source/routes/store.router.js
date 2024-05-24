import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/** 아이템 구입 API **/
router.post('/store/buy/:characterId', authMiddleware, async (req, res, next) =>
{
	try
	{
		const { id } = req.account;
		const { characterId } = req.params;
		const { itemId, count } = req.body;
		const character = await prisma.characters.findFirst({ where: { id: +characterId } });
		const item = await prisma.items.findFirst({ where: { id: +itemId } });

		if (!character)
			return res.status(404).json({ errorMessage: '존재하지 않는 캐릭터입니다.' });
		else if (id != character.accountId)
			return res.status(403).json({ errorMessage: '다른 계정의 캐릭터로는 구매할 수 없습니다!' });

		if (!item)
			return res.status(404).json({ errorMessage: '존재하지 않는 아이템입니다.' });

		if (character.money < item.price * count)
			return res.status(400).json({ errorMessage: '아이템을 구매하기 위한 재화가 부족합니다!' });

		await prisma.$transaction(
			async tx =>
			{
				const itemInInventory = await tx.inventory.findFirst({
					where: { ownItem: itemId }
				});

				if (!itemInInventory)
					await tx.inventory.create({
						data: {
							characterId: +characterId,
							ownItem: itemId,
							count: count
						},
					});
				else
					await tx.inventory.update({
						data: { count: itemInInventory.count + count },
						where: {
							id: itemInInventory.id
						}
					});

				await tx.characters.update({
					data: {
						money: character.money - item.price * count
					},
					where: {
						id: +characterId
					}
				});
			},
			{
				isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
			}
		);

		return res.status(200).json({ remainedMoney: character.money });
	}
	catch (error)
	{
		next(error);
	}
});

export default router;