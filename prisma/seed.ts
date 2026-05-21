import { PrismaClient, SystemRole } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Must match auth-utils.ts hashString — no case transformation
function hashString(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

async function main() {
  console.log('Seeding...')

  const passcode = process.env.SUPER_ADMIN_PASSCODE ?? '123456'

  await prisma.user.upsert({
    where: { username: 'super_admin' },
    update: {},
    create: {
      username: 'super_admin',
      displayName: 'Super Admin',
      role: SystemRole.SUPER_ADMIN,
      passcodeHash: hashString(passcode),
    },
  })

  console.log(`\nSeed complete.`)
  console.log(`  username : super_admin`)
  console.log(`  passcode : ${passcode}`)
  console.log(`  (set SUPER_ADMIN_PASSCODE env var to override)\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
