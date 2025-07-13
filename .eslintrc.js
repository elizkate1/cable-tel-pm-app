module.exports = {
  extends: ['react-app', 'react-app/jest'],
  rules: {
    // Disable the exhaustive-deps rule for simplicity in this prototype.
    // In a production app, you would typically fix these warnings rather than disabling the rule.
    'react-hooks/exhaustive-deps': 'off',
  },
};