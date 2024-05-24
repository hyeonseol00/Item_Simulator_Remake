import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
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
		const item = await prisma.items.findFirst({ where: { id: +ele.equippedItem } });

		result.push({
			itemId: ele.equippedItem,
			itemName: item.name,
		});
	});

	await Promise.all(promises);

	return res.status(201).json(result);
});

/** 아이템 장착 API **/
router.post('/character/:characterId/equip', authMiddleware, async (req, res, next) =>
{
	const { id } = req.account;
	const { characterId } = req.params;
	const { itemId } = req.body;
	const character = await prisma.characters.findFirst({ where: { id: +characterId } });
	const item = await prisma.items.findFirst({ where: { id: +itemId } });
	const itemInInventory = await prisma.inventory.findFirst({
		where: {
			ownItem: +itemId,
			characterId: +characterId,
		}
	});
	const itemInEquip = await prisma.equip.findFirst({
		where: {
			equippedItem: +itemId,
			characterId: +characterId,
		}
	});

	if (!character)
		return res.status(404).json({ errorMessage: '존재하지 않는 캐릭터입니다.' });
	else if (id != character.accountId)
		return res.status(403).json({ errorMessage: '다른 계정의 캐릭터는 조작할 수 없습니다!' });

	if (!itemInInventory)
		return res.status(404).json({ errorMessage: '아이템을 보유하고 있지 않습니다!' });
	if (itemInEquip)
		return res.status(404).json({ errorMessage: '동일한 아이템을 이미 장착중입니다!' });

	await prisma.$transaction(
		async tx =>
		{
			// 1. 장비창에 추가
			await tx.equip.create({
				data: {
					characterId: +characterId,
					equippedItem: itemId,
				},
			});

			// 2. 인벤토리에서 삭제
			if (itemInInventory.count == 1)
				await tx.inventory.delete({
					where: {
						id: itemInInventory.id,
					},
				});
			else
				await tx.inventory.update({
					data: {
						count: itemInInventory.count - 1
					},
					where: {
						id: itemInInventory.id,
					}
				});

			// 3. 캐릭터 스탯 변경
			await tx.characters.update({
				data: {
					health: character.health + item.statHealth,
					power: character.power + item.statPower,
				},
				where: {
					id: +characterId,
				}
			});
		},
		{
			isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
		}
	);

	return res.status(201).json({ message: "장착 성공!" });
});

/** 아이템 장착 해제 API **/
router.delete('/character/:characterId/equip', authMiddleware, async (req, res, next) =>
{
	const { id } = req.account;
	const { characterId } = req.params;
	const { itemId } = req.body;
	const character = await prisma.characters.findFirst({ where: { id: +characterId } });
	const item = await prisma.items.findFirst({ where: { id: +itemId } });
	const itemInInventory = await prisma.inventory.findFirst({
		where: {
			ownItem: +itemId,
			characterId: +characterId,
		}
	});
	const itemInEquip = await prisma.equip.findFirst({
		where: {
			equippedItem: +itemId,
			characterId: +characterId,
		}
	});

	if (!character)
		return res.status(404).json({ errorMessage: '존재하지 않는 캐릭터입니다.' });
	else if (id != character.accountId)
		return res.status(403).json({ errorMessage: '다른 계정의 캐릭터는 조작할 수 없습니다!' });

	if (!itemInEquip)
		return res.status(404).json({ errorMessage: '아이템을 장착하고 있지 않습니다!' });

	await prisma.$transaction(
		async tx =>
		{
			// 1. 장비창에서 삭제
			await tx.equip.delete({
				where: {
					id: itemInEquip.id
				},
			});

			// 2. 인벤토리에 추가
			if (!itemInInventory)
				await tx.inventory.create({
					data: {
						characterId: +characterId,
						ownItem: itemId,
						count: 1
					},
				});
			else
				await tx.inventory.update({
					data: { count: itemInInventory.count + 1 },
					where: {
						id: itemInInventory.id
					}
				});

			// 3. 캐릭터 스탯 변경
			await tx.characters.update({
				data: {
					health: character.health - item.statHealth,
					power: character.power - item.statPower,
				},
				where: {
					id: +characterId,
				}
			});
		},
		{
			isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
		}
	);

	return res.status(201).json({ message: "장착 해제 성공!" });
});

export default router;