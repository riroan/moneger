// Set globals before any imports
const { TextEncoder, TextDecoder } = require('util')
const { ReadableStream, WritableStream, TransformStream } = require('stream/web')

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Stub TextEncoderStream and TextDecoderStream for edge-runtime
global.TextEncoderStream = class TextEncoderStream {}
global.TextDecoderStream = class TextDecoderStream {}

// Add stream polyfills
global.ReadableStream = ReadableStream
global.WritableStream = WritableStream
global.TransformStream = TransformStream

// Add structuredClone polyfill (Node.js 17+ has it, but for compatibility)
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj))
}
