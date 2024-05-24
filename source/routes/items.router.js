import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';

const router = express.Router();

/** 아이템 생성 API **/
router.post("/item", async (req, res, next) =>
{
	const { name, statHealth, statPower, price } = req.body;

	const isExistItem = await prisma.items.findFirst({ where: { name } });
	if (isExistItem)
		return res.status(409).json({ message: '중복된 이름입니다.' });

	const item = await prisma.items.create({
		data: {
			name,
			statHealth,
			statPower,
			price
		}
	});

	return res.status(201).json({ data: item });
});

/** 아이템 수정 API **/
router.patch("/item", async (req, res, next) =>
{
	const { name, newName, statHealth, statPower } = req.body;

	await prisma.$transaction(
		async (tx) =>
		{
			await tx.items.update({
				data: { newName, statHealth, statPower },
				where: { name }
			});
		},
		{
			isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
		},
	);

	return res.status(201).json({ message: "아이템 정보 수정을 완료했습니다." });
});

export default router;