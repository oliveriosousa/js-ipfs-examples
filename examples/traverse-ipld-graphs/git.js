'use strict'

const createNode = require('./create-node')
const path = require('path')
const { CID } = require('multiformats/cid')
const MultihashDigest = require('multiformats/hashes/digest')
const fs = require('fs').promises
const uint8ArrayToString = require('uint8arrays/to-string')
const { convert } = require('ipld-format-to-blockcodec')
const crypto = require('crypto')

async function main () {
  const ipfs = await createNode({
    ipld: {
      codecs: [
        convert(require('ipld-git'))
      ],
      hashers: [{
        name: 'sha1',
        code: 0x11,
        digest: async (buf) => {
          return MultihashDigest.create(0x11, crypto.createHash('sha1').update(buf).digest())
        }
      }]
    }
  })

  console.log('\nStart of the example:')

  const gitObjects = [
    path.join(__dirname, '/git-objects/0f328c91df28c5c01b9e9f9f7e663191fa156593'),
    path.join(__dirname, '/git-objects/177bf18bc707d82b21cdefd0b43b38fc8c5c13fe'),
    path.join(__dirname, '/git-objects/23cc25f631cb076d5de5036c87678ea713cbaa6a'),
    path.join(__dirname, '/git-objects/4e425dba7745a781f0712c9a01455899e8c0c249'),
    path.join(__dirname, '/git-objects/6850c7be7136e6be00976ddbae80671b945c3e9d'),
    path.join(__dirname, '/git-objects/a5095353cd62a178663dd26efc2d61f4f61bccbe'),
    path.join(__dirname, '/git-objects/dc9bd15e8b81b6565d3736f9c308bd1bba60f33a'),
    path.join(__dirname, '/git-objects/e68e6f6e31857877a79fd6b3956898436bb5a76f'),
    path.join(__dirname, '/git-objects/ee62b3d206cb23f939208898f32d8708c0e3fa3c'),
    path.join(__dirname, '/git-objects/ee71cef5001b84b0314438f76cf0acd338a2fd21')
  ]

  await Promise.all(gitObjects.map(async gitObjectsPath => {
    const data = await fs.readFile(gitObjectsPath)

    const cid = await ipfs.block.put(data, {
      format: 'git-raw',
      mhtype: 'sha1',
      version: 1
    })

    console.log(cid.toString())
  }))

  const v1tag = CID.parse('z8mWaGfwSWLMPJ6Q2JdsAjGiXTf61Nbue')

  async function logResult (fn, comment) {
    const result = await fn()

    if (result.value instanceof Uint8Array) { // Blobs (files) are returned as buffer instance
      result.value = uint8ArrayToString(result.value)
    }

    console.log('-'.repeat(80))
    console.log(comment)
    console.log(result.value)
  }

  await logResult(() => ipfs.dag.get(v1tag), 'Tag object:')
  await logResult(() => ipfs.dag.get(v1tag, { path: '/object/message' }), 'Tagged commit message:')
  await logResult(() => ipfs.dag.get(v1tag, { path: '/object/parents/0/message' }), 'Parent of tagged commit:')
  await logResult(() => ipfs.dag.get(v1tag, { path: '/object/tree/src/hash/hello/hash' }), '/src/hello file:')
  await logResult(() => ipfs.dag.get(v1tag, { path: '/object/parents/0/tree/src/hash/hello/hash' }), 'previous version of /src/hello file:')

  await ipfs.stop()
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
