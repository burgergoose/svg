/*global Ultraviolet*/
self.__uv$config = {
  prefix: '/burgergoose/svg/main/v0002/a/service/',
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: 'https://raw.githack.com/burgergoose/engine/main/controller/uv.handler.js',
  client: 'https://raw.githack.com/burgergoose/engine/main/controller/uv.client.js',
  bundle: 'https://raw.githack.com/burgergoose/engine/main/core/uv.bundle.js',
  config: '/burgergoose/svg/main/v0002/a/uv.config.js',
  sw: 'https://raw.githack.com/burgergoose/engine/main/core/uv.sw.js',
};
