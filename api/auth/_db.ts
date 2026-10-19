import { PrismaClient, WalletCurrency } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const WALLET_CURRENCIES: WalletCurrency[] = ['USD', 'EUR', 'GBP', 'BTC', 'ETH', 'USDT'];

export async function provisionGoogleUser(profile: { sub: string; email: string; name?: string }) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { googleId: profile.sub },
      create: { googleId: profile.sub, email: profile.email.toLowerCase(), name: profile.name || '' },
      update: { email: profile.email.toLowerCase(), name: profile.name || '' },
    });
    for (const currency of WALLET_CURRENCIES) {
      await tx.wallet.upsert({
        where: { userId_currency: { userId: user.id, currency } },
        create: { userId: user.id, currency, balance: 0 },
        update: {},
      });
    }
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const session = await tx.authSession.create({ data: { userId: user.id, expiresAt } });
    return { user, session };
  });
}
