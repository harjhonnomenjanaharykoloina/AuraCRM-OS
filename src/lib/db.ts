import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)

const prismaIntFields = new Set([
    'userId', 'groupId', 'ownerId',
    'createdById', 'lastModifiedById', 'changedById',
    'oldOwnerId', 'newOwnerId', 'authorId', 'assigneeId',
])

function convertIntFields(data: any) {
    if (!data || typeof data !== 'object') return
    const items = Array.isArray(data) ? data : [data]
    for (const item of items) {
        if (item && typeof item === 'object') {
            for (const [key, value] of Object.entries(item)) {
                if (
                    prismaIntFields.has(key) &&
                    typeof value === 'string' &&
                    /^-?\d+$/.test(value)
                ) {
                    item[key] = parseInt(value, 10)
                }
            }
        }
    }
}

const rawClient = globalForPrisma.prisma ?? new PrismaClient({ adapter })

export const db = rawClient.$extends({
    query: {
        session: {
            create({ query, args }) {
                convertIntFields(args.data)
                return query(args)
            },
            update({ query, args }) {
                convertIntFields(args.data)
                return query(args)
            },
        },
        account: {
            create({ query, args }) {
                convertIntFields(args.data)
                return query(args)
            },
            update({ query, args }) {
                convertIntFields(args.data)
                return query(args)
            },
        },
        user: {
            create({ query, args }) {
                convertIntFields(args.data)
                return query(args)
            },
            update({ query, args }) {
                convertIntFields(args.data)
                return query(args)
            },
        },
    },
}) as unknown as PrismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = rawClient
