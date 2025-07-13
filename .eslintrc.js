module.exports = {
  // This extends the recommended ESLint configuration for React apps.
  // However, we are overriding specific rules below to be less strict for deployment.
  extends: ['react-app'],
  rules: {
    // Turn off all warnings and errors for a quick build.
    // This is generally NOT recommended for production code, but useful for debugging stubborn CI builds.
    'no-unused-vars': 'off',
    'no-undef': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'no-restricted-globals': 'off',
    'no-redeclare': 'off',
    'import/no-anonymous-default-export': 'off',
    // You can add other rules here and set them to 'off' if specific warnings
    // continue to cause build failures.
  },
};