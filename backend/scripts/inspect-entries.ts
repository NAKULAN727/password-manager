import prisma from '../src/lib/prisma';

async function main() {
  const entries = await prisma.vaultEntry.findMany({
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Total entries: ${entries.length}\n`);

  for (const e of entries) {
    const cipherBuf = Buffer.from(e.ciphertext, 'base64');
    const ivBuf = Buffer.from(e.iv, 'base64');
    const tagBuf = e.tag ? Buffer.from(e.tag, 'base64') : null;

    console.log('─'.repeat(60));
    console.log(`Label:      ${e.label}`);
    console.log(`Username:   ${e.username}`);
    console.log(`Created:    ${e.createdAt.toISOString()}`);
    console.log(`ciphertext: ${e.ciphertext.substring(0, 40)}... (base64 len: ${e.ciphertext.length}, bytes: ${cipherBuf.length})`);
    console.log(`iv:         ${e.iv} (base64 len: ${e.iv.length}, bytes: ${ivBuf.length})`);
    console.log(`tag:        ${e.tag ? e.tag.substring(0, 40) : 'NULL'} (base64 len: ${e.tag?.length ?? 0}, bytes: ${tagBuf?.length ?? 0})`);
    console.log(`checksum:   ${e.checksum ? e.checksum.substring(0, 20) + '...' : 'NULL'}`);
    console.log();
  }

  await prisma.$disconnect();
}

main().catch(console.error);
