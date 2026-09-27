import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)

const prismaIntFields = new Set([
    'id', 'userId', 'groupId', 'ownerId',
    'createdById', 'lastModifiedById', 'changedById',
    'oldOwnerId', 'newOwnerId', 'authorId', 'assigneeId',
    'organizationId',
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

function convertWhereIntFields(where: any, forceConvert = false) {
    if (!where || typeof where !== 'object') return
    if (Array.isArray(where)) {
        for (const item of where) {
            convertWhereIntFields(item, forceConvert)
        }
        return
    }
    for (const [key, value] of Object.entries(where)) {
        if (forceConvert || prismaIntFields.has(key)) {
            if (typeof value === 'string' && /^-?\d+$/.test(value)) {
                where[key] = parseInt(value, 10)
            } else if (Array.isArray(value)) {
                for (let i = 0; i < value.length; i++) {
                    if (typeof value[i] === 'string' && /^-?\d+$/.test(value[i])) {
                        value[i] = parseInt(value[i], 10)
                    }
                }
            } else if (value && typeof value === 'object') {
                convertWhereIntFields(value, true)
            }
        } else if (value && typeof value === 'object') {
            convertWhereIntFields(value)
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
                convertWhereIntFields(args?.where)
                return query(args)
            },
            updateMany({ query, args }) {
                convertIntFields(args.data)
                convertWhereIntFields(args?.where)
                return query(args)
            },
            findFirst({ query, args }) {
                convertWhereIntFields(args?.where)
                return query(args)
            },
            findUnique({ query, args }) {
                convertWhereIntFields(args?.where)
                return query(args)
            },
            findMany({ query, args }) {
                convertWhereIntFields(args?.where)
                return query(args)
            },
            delete({ query, args }) {
                convertWhereIntFields(args?.where)
                return query(args)
            },
            deleteMany({ query, args }) {
                convertWhereIntFields(args?.where)
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
                convertWhereIntFields(args?.where)
                return query(args)
            },
            updateMany({ query, args }) {
                convertIntFields(args.data)
                convertWhereIntFields(args?.where)
                return query(args)
            },
            findFirst({ query, args }) {
                convertWhereIntFields(args?.where)
                return query(args)
            },
            findUnique({ query, args }) {
                convertWhereIntFields(args?.where)
                return query(args)
            },
            findMany({ query, args }) {
                convertWhereIntFields(args?.where)
                return query(args)
            },
            delete({ query, args }) {
                convertWhereIntFields(args?.where)
                return query(args)
            },
            deleteMany({ query, args }) {
                convertWhereIntFields(args?.where)
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
                convertWhereIntFields(args?.where)
                return query(args)
            },
            updateMany({ query, args }) {
                convertIntFields(args.data)
                convertWhereIntFields(args?.where)
                return query(args)
            },
            findFirst({ query, args }) {
                convertWhereIntFields(args?.where)
                return query(args)
            },
            findUnique({ query, args }) {
                convertWhereIntFields(args?.where)
                return query(args)
            },
            findMany({ query, args }) {
                convertWhereIntFields(args?.where)
                return query(args)
            },
            delete({ query, args }) {
                convertWhereIntFields(args?.where)
                return query(args)
            },
            deleteMany({ query, args }) {
                convertWhereIntFields(args?.where)
                return query(args)
            },
        },
    },
}) as unknown as PrismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = rawClient
