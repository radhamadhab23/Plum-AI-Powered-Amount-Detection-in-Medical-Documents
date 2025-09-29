// Jest setup file
global.console = {
  ...console,
  // Suppress console.log during tests unless needed
  log: process.env.NODE_ENV === 'test' ? jest.fn() : console.log,
  warn: console.warn,
  error: console.error,
};
