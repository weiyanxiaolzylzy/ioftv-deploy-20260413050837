module.exports = {
  presets: [
    [
      '@vue/app',
      {
        useBuiltIns: false,
        targets: {
          chrome: '79',
        },
      },
    ],
  ],
};
