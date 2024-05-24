import express from 'express';
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';

const router = express.Router();

/** 사용자 회원가입 API **/
router.post('/sign-up', async (req, res, next) =>
{
	try
	{
		const { loginId, password, passwordCheck, userName } = req.body;
		const isExistUser = await prisma.users.findFirst({
			where: {
				loginId,
			},
		});

		if (isExistUser)
			return res.status(409).json({ message: '이미 존재하는 ID입니다.' });
		else if (password != passwordCheck)
			return res.status(400).json({ message: '입력한 비밀번호가 서로 다릅니다.' });

		const hashedPassword = await bcrypt.hash(password, 10);

		const [account] = await prisma.$transaction(
			async tx =>
			{
				const account = await tx.accounts.create({
					data: {
						loginId,
						password: hashedPassword,
						userName
					},
				});

				return [account];
			},
			{
				isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
			}
		);

		return res.status(201).json({ message: '회원가입이 완료되었습니다.' });
	}
	catch (error)
	{
		next(error);
	}
});