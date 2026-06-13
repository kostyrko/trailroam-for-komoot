export default [
  {
    context: ['/api'],
    target: 'https://api.komoot.de',
    changeOrigin: true,
    secure: true,
    headers: {
      'Origin': 'https://api.komoot.de',
    },
  },
];
